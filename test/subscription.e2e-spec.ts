import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { mswServer } from './mocks/msw-server';

describe('SubscriptionController', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    mswServer.listen();

    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('paypulse_e2e_test')
      .start();

    process.env.DATABASE_URL = container.getConnectionUri();

    execSync('npx prisma db push', {
      env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
  }, 60000);

  afterEach(async () => {
    mswServer.resetHandlers();
    await prisma.outboxEvent.deleteMany();
    await prisma.subscription.deleteMany();
  });

  afterAll(async () => {
    mswServer.close();
    await app.close();
    await container.stop();
  });

  it('POST/subscriptions -> 400 bad request on invalid Dto payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/subscriptions')
      .send({
        userId: 'user-222',
        email: 'alex@example.com',
        planTier: 'PRO',
        paymentMethodId: 'pm_card_visa',
      })
      .expect(201);

    expect(response.body.status).toBe('ACTIVE');
    expect(response.body.subscriptionId).not.toBeNull();

    const dbSub = await prisma.subscription.findUnique({
      where: { id: response.body.subscriptionId },
    });

    expect(dbSub).not.toBeNull();
    expect(dbSub?.planTier).toBe('PRO');
  });

  it('POST/subscriptions -> Error when stripe card is declined by issuer', async () => {
    await request(app.getHttpServer())
      .post('/subscription')
      .send({
        userId: 'user-333',
        email: 'bob@gmail.com',
        planTier: 'BASIC',
        paymentMethodId: 'pm-card_declined',
      })
      .expect(500);
  });
});
