import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { PrismaService } from '../prisma.service';
import { PrismaSubscriptionRepository } from './prisma-subscription.repository';
import { Money } from '../../../domain/value-objects/money.vo';
import { PlanTier } from '../../../domain/enums/plan-tier.enums';
import { Subscription } from '../../../domain/entities/subscription.entity';

describe('PrismaSubscriptionRepository Integration Test', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let repository: PrismaSubscriptionRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('paypulse_test')
      .withUsername('test_user')
      .withPassword('test_pass')
      .start();

    process.env.DATABASE_URL = container.getConnectionUri();

    execSync('npx prisma db push', {
      env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
    });

    prisma = new PrismaService();
    await prisma.onModuleInit();

    repository = new PrismaSubscriptionRepository(prisma);
  }, 120000);

  afterEach(async () => {
    await prisma?.outboxEvent.deleteMany();
    await prisma?.subscription.deleteMany();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await container.stop();
  });

  it('should atomically save subscription and outbox event', async () => {
    const sub = new Subscription(
      'sub-999',
      'user_123',
      PlanTier.PRO,
      new Money(30, 'USD'),
      new Date('2026-10-01'),
    );

    await repository.saveWithOutbox(sub, 'subscription.created', {
      SubscriptionId: sub.id,
      userId: sub.userId,
    });

    const dbsub = await prisma.subscription.findUnique({ where: { id: 'sub-999' } });
    const dbEvent = await prisma.outboxEvent.findFirst({
      where: { eventType: 'subscription.created' },
    });

    expect(dbsub).not.toBeNull();
    expect(dbsub?.planTier).toBe('PRO');
    expect(dbsub?.priceAmount).toBe(30);

    expect(dbEvent).not.toBeNull();
    expect(dbEvent?.status).toBe('PENDING');
  });

  it('should update subscription status to PAST_DUE and write outbox event atomically', async () => {
    const sub = new Subscription(
      'sub-888',
      'user-123',
      PlanTier.BASIC,
      new Money(10, 'USD'),
      new Date('2026-10-01'),
    );

    await repository.saveWithOutbox(sub, 'subscription.created', {});

    sub.markPastDue();

    await repository.saveWithOutbox(sub, 'subscription.past_due', {
      retryCount: sub.getRetryCount(),
    });

    const updatedSub = await prisma.subscription.findUnique({
      where: { id: 'sub-888' },
    });

    expect(updatedSub).not.toBeNull();
    expect(updatedSub?.status).toBe('PAST_DUE');
    expect(updatedSub?.retryCount).toBe(1);

    const pastDueEvent = await prisma.outboxEvent.findFirst({
      where: { eventType: 'subscription.past_due' },
    });

    expect(pastDueEvent).not.toBeNull();
  });
});
