import { SubscriptionStatus } from '../enums/subscription.enums';
import { PlanTier } from '../enums/plan-tier.enums';
import { Money } from '../value-objects/money.vo';
import { DomainError } from '../errors/domain.erros';

export class Subscription {
  private status: SubscriptionStatus;
  private retryCount: number;
  private nextRenewalDate: Date;
  private planTier: PlanTier;
  private price: Money;

  constructor(
    public readonly id: string,
    public readonly userId: string,
    planTier: PlanTier,
    price: Money,
    nextRenewalDate: Date,
  ) {
    this.planTier = planTier;
    this.price = price;
    this.nextRenewalDate = nextRenewalDate;
    this.status = SubscriptionStatus.ACTIVE; // New subscriptions start ACTIVE
    this.retryCount = 0;
  }

  getStatus(): SubscriptionStatus {
    return this.status;
  }
  getRetryCount(): number {
    return this.retryCount;
  }
  getNextRenewalDate(): Date {
    return this.nextRenewalDate;
  }
  getPlanTier(): PlanTier {
    return this.planTier;
  }
  getPrice(): Money {
    return this.price;
  }

  markPastDue(): void {
    if (this.status === SubscriptionStatus.CANCELLED) {
      throw new DomainError('Cannot mark a cancelled subscription as past due');
    } else {
      this.status = SubscriptionStatus.PAST_DUE;
      this.retryCount += 1;
    }
  }
  renew(nextRenewalDate: Date): void {
    if (this.status === SubscriptionStatus.CANCELLED) {
      throw new DomainError('cannot renew a cancelled subscription');
    } else {
      this.status = SubscriptionStatus.ACTIVE;
      this.nextRenewalDate = nextRenewalDate;
      this.retryCount = 0;
    }
  }

  cancel(): void {
    if (this.status === SubscriptionStatus.CANCELLED) {
      throw new DomainError('subscription is already cancelled');
    } else {
      this.status = SubscriptionStatus.CANCELLED;
    }
  }

  upgradePlan(newPlanTier: PlanTier, newPrice: Money): void {
    if (this.status === SubscriptionStatus.CANCELLED) {
      throw new DomainError('cannot upgrade a cancelled subscription');
    } else {
      this.planTier = newPlanTier;
      this.price = newPrice;
    }
  }
}
