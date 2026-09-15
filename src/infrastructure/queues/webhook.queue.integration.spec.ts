import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';
import { PrismaService } from '../database/prisma.service';
import { PrismaSubscriptionRepository } from '../database/repositories/prisma-subscription.repository';
import { WebhookProducer } from './outbox.processor';
import { WebhookProcessor } from './webhook.consume';
import { Subscription } from '../../domain/entities/subscription.entity';
import { PlanTier } from '../../domain/enums/plan-tier.enums';
import { Money } from '../../domain/value-objects/money.vo';

describe('webhook queue system ', () => {
  let postgresContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedRedisContainer;
  let prisma: PrismaService;
  let repository: PrismaSubscriptionRepository;
  let producer: WebhookProducer;
  let processor: WebhookProcessor;

  const wait = async (predicate: () => boolean, timeoutMs = 10000): Promise<void> => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timeout waiting for condition`);
  };

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')

      .withDatabase('paypulse_e2e_test')
      .withUsername('test_user')
      .withPassword('test_pass')
      .start();

    process.env.DATABASE_URL = postgresContainer.getConnectionUri();

    execSync('npx prisma db push', {
      env: { ...process.env, DATABASE_URL: postgresContainer.getConnectionUri() },
    });

    redisContainer = await new RedisContainer('redis:7-alpine').start();

    const connectionOptions = {
      host: redisContainer.getHost(),
      port: redisContainer.getPort(),
    };

    prisma = new PrismaService();
    await prisma.onModuleInit();

    repository = new PrismaSubscriptionRepository(prisma);
    producer = new WebhookProducer(prisma, connectionOptions);
  }, 90000);

  afterEach(async () => {
    await prisma?.outboxEvent.deleteMany();
    await prisma?.subscription.deleteMany();
  });

  afterAll(async () => {
    await producer?.close();
    await processor?.close();
    await prisma?.onModuleDestroy();
    await postgresContainer.stop();
    await redisContainer?.stop();
  });

  it('should process webhook job successfully', async () => {
    const deliveredWebhooks: Array<{ url: string; body: any }> = [];

    const mockHttpPost = async (url: string, body: any) => {
      deliveredWebhooks.push({ url, body });
      return { status: 200 };
    };

    const connectionOptions = {
      host: redisContainer.getHost(),
      port: redisContainer.getPort(),
    };

    processor = new WebhookProcessor(connectionOptions, mockHttpPost);

    // save subscription + outbox event in postgres
    const sub = new Subscription(
      'sub-777',
      'user-100',
      PlanTier.ENTERPRISE,
      new Money(100, 'USD'),
      new Date('2026-10-01'),
    );

    await repository.saveWithOutbox(sub, 'subscription.created', {
      SubscriptionId: sub.id,
      webhookUrl: 'https://customer.com/events',
    });

    //verify pending events in postgres
    const pendingBefore = await prisma.outboxEvent.findFirst({
      where: { status: 'PENDING' },
    });
    expect(pendingBefore).not.toBeNull();

    // producer polls postgres to processes to push to redis
    const processedCount = await producer.processPendingEvents();
    expect(processedCount).toBe(1);

    // verify outbox status changed to processed in postgres

    const pendingAfter = await prisma.outboxEvent.findFirst({
      where: { id: pendingBefore?.id },
    });
    expect(pendingAfter?.status).toBe('PROCESSED');

    // worker consume the job and Execute http post

    await wait(() => deliveredWebhooks.length > 0);

    expect(deliveredWebhooks[0].body.eventType).toBe('subscription.created');
  });
});
