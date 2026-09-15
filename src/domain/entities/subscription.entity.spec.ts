import { Subscription } from './subscription.entity';
import { SubscriptionStatus } from '../enums/subscription.enums';
import { PlanTier } from '../enums/plan-tier.enums';
import { Money } from '../value-objects/money.vo';
import { DomainError } from '../errors/domain.erros';

describe('subscription Entity', () => {
  let price: Money;
  let nextMonth: Date;

  beforeEach(() => {
    price = new Money(30, 'USD');
    nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
  });

  it('should initialize with ACTIVE status and 0 retries', () => {
    const sub = new Subscription('sub_1', 'user_1', PlanTier.PRO, price, nextMonth);

    expect(sub.getStatus()).toBe(SubscriptionStatus.ACTIVE);
    expect(sub.getRetryCount()).toBe(0);
  });

  it('should mark past due and increment retry count', () => {
    const sub = new Subscription('sub_1', 'user_1', PlanTier.PRO, price, nextMonth);

    sub.markPastDue();

    expect(sub.getStatus()).toBe(SubscriptionStatus.PAST_DUE);
    expect(sub.getRetryCount()).toBe(1);
  });

  it('should renew subscription back to ACTIVE and reset retries to 0', () => {
    const sub = new Subscription('sub_1', 'user_1', PlanTier.PRO, price, nextMonth);
    sub.markPastDue();

    const newRenewalDate = new Date();
    sub.renew(newRenewalDate);

    expect(sub.getStatus()).toBe(SubscriptionStatus.ACTIVE);
    expect(sub.getRetryCount()).toBe(0);
  });

  it('should cancel subscription', () => {
    const sub = new Subscription('sub_1', 'user_1', PlanTier.PRO, price, nextMonth);

    sub.cancel();

    expect(sub.getStatus()).toBe(SubscriptionStatus.CANCELLED);
  });

  it('should throw DomainError when marking a cancelled subscription past due', () => {
    const sub = new Subscription('sub_1', 'user_1', PlanTier.PRO, price, nextMonth);

    sub.cancel();

    expect(() => sub.markPastDue()).toThrow(DomainError);
  });
});
