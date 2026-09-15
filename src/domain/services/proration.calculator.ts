import { Money } from '../value-objects/money.vo';
import { DomainError } from '../errors/domain.erros';
import { Domain } from 'domain';

export class ProrationCalculator {
  static calculateUpgradeProration(
    currentPrice: Money,
    newPrice: Money,
    daysRemainingInMonth: number,
  ): Money {
    if (daysRemainingInMonth < 0 || daysRemainingInMonth > 30) {
      throw new DomainError('Days remaining must be between 0 and 30');
    }

    if (currentPrice.getCurrency() !== newPrice.getCurrency()) {
      throw new DomainError('currency mismatch for proration');
    }

    if (newPrice.getAmount() <= currentPrice.getAmount()) {
      throw new DomainError('New plan price must be higher than current plan');
    }

    const priceDifference = newPrice.getAmount() - currentPrice.getAmount();
    const prorationAmount = (priceDifference * daysRemainingInMonth) / 30;

    return new Money(prorationAmount, currentPrice.getCurrency());
  }
}
