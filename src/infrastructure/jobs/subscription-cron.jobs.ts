import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { PrismaSubscriptionRepository } from '../database/repositories/prisma-subscription.repository';
import { StripePaymentClient } from '../payment/stripe-payment.client';
import { Subscription } from '../../domain/entities/subscription.entity';
import { PLAN_PRICES, PlanTier } from '../../domain/enums/plan-tier.enums';
import { Money } from '../../domain/value-objects/money.vo';

@Injectable()
export class SubscriptionCronProcessor {
  private readonly logger = new Logger(SubscriptionCronProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: PrismaSubscriptionRepository,
    private readonly stripeClient: StripePaymentClient,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyBillingCron(): Promise<void> {
    this.logger.log('Cron job is running');
    await this.processDueRenewals();
    await this.processExpireGracePeroids();
    this.logger.log('Cron jon is completed');
  }

  async processDueRenewals(): Promise<number> {
    const today = new Date();

    const dueSubscriptions = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', nextRenewalDate: { lte: today } },
    });

    let processedCount = 0;

    for (const due of dueSubscriptions) {
      const sub = new Subscription(
        due.id,
        due.userId,
        due.planTier as PlanTier,
        new Money(due.priceAmount, due.currency),
        due.nextRenewalDate,
      );

      const priceAmount = PLAN_PRICES[sub.getPlanTier()];

      try {
        await this.stripeClient.chargeCard('pm_card_visa', priceAmount);

        const newRenewalDate = new Date();
        newRenewalDate.setDate(newRenewalDate.getDate() + 30);

        sub.renew(newRenewalDate);

        await this.repository.saveWithOutbox(sub, 'subscription.renewed', {
          SubscriptionId: sub.id,
          userId: sub.userId,
        });
      } catch (error) {
        this.logger.warn(`Payment Failed for subscription renewal ${sub.id}`);

        sub.markPastDue();

        await this.repository.saveWithOutbox(sub, 'subscription.past_due', {
          subscriptionId: sub.id,
          userId: sub.userId,
          retryCount: sub.getRetryCount(),
        });
      }
      processedCount++;
    }
    return processedCount;
  }

  async processExpireGracePeroids(): Promise<number> {
    const expiredSubscription = await this.prisma.subscription.findMany({
      where: { status: 'PAST_DUE', retryCount: { gte: 3 } },
    });

    let cancelledCount = 0;
    for (const exp of expiredSubscription) {
      const sub = new Subscription(
        exp.id,
        exp.userId,
        exp.planTier as PlanTier,
        new Money(exp.priceAmount, exp.currency),
        exp.nextRenewalDate,
      );

      for (let i = 0; i < exp.retryCount; i++) {
        sub.markPastDue();
      }

      sub.cancel();

      await this.repository.saveWithOutbox(sub, 'subscription.cancelled', {
        subscriptionId: sub.id,
        userId: sub.userId,
      });
      cancelledCount++;
    }
    return cancelledCount;
  }
}
