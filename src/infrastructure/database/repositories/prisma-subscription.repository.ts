import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ISubscriptionRepository } from '../../../application/ports/subscription-repository.interface';
import { Subscription } from '../../../domain/entities/subscription.entity';
import { PlanTier } from '../../../domain/enums/plan-tier.enums';
import { Money } from '../../../domain/value-objects/money.vo';

@Injectable()
export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Subscription | null> {
    const raw = await this.prisma.subscription.findUnique({ where: { id } });
    if (!raw) return null;

    const subscription = new Subscription(
      raw.id,
      raw.userId,
      raw.planTier as PlanTier,
      new Money(raw.priceAmount, raw.currency),
      raw.nextRenewalDate,
    );

    if (raw.status === 'PAST_DUE') {
      for (let i = 0; i < raw.retryCount; i++) {
        subscription.markPastDue();
      }
    } else if (raw.status === 'CANCELED') {
      subscription.cancel();
    }

    return subscription;
  }

  async saveWithOutbox(
    subscription: Subscription,
    eventType: string,
    payload: Record<string, any>,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { id: subscription.id },
        update: {
          status: subscription.getStatus() as any,
          retryCount: subscription.getRetryCount(),
          nextRenewalDate: subscription.getNextRenewalDate(),
          planTier: subscription.getPlanTier() as any,
          priceAmount: subscription.getPrice().getAmount(),
        },

        create: {
          id: subscription.id,
          userId: subscription.userId,
          planTier: subscription.getPlanTier() as any,
          priceAmount: subscription.getPrice().getAmount(),
          currency: subscription.getPrice().getCurrency(),
          status: subscription.getStatus() as any,
          retryCount: subscription.getRetryCount(),
          nextRenewalDate: subscription.getNextRenewalDate(),
        },
      }),
      this.prisma.outboxEvent.create({
        data: {
          eventType,
          payload,
          status: 'PENDING',
        },
      }),
    ]);
  }
}
