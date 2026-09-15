import * as fc from 'fast-check';
import { ProrationCalculator } from './proration.calculator';
import { Money } from '../value-objects/money.vo';

describe('Proration Property-Based tests', () => {
  beforeEach;
  it('proration amount must never exceed the total price differnce ', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 1000, noNaN: true }),
        fc.float({ min: 1001, max: 5000, noNaN: true }),
        fc.integer({ min: 0, max: 30 }),
        (oldPrice, newPrice, days) => {
          const currentMoney = new Money(oldPrice, 'USD');
          const newMoney = new Money(newPrice, 'USD');

          const prorated = ProrationCalculator.calculateUpgradeProration(
            currentMoney,
            newMoney,
            days,
          );

          const maxPossibleDiff = newPrice - oldPrice;

          expect(prorated.getAmount()).toBeLessThanOrEqual(maxPossibleDiff + 0.01);

          expect(prorated.getAmount()).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  it('0 days remaining always results in $0 prorated charge', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 1000, noNaN: true }),
        fc.float({ min: 1001, max: 5000, noNaN: true }),
        (oldPrice, newPrice) => {
          const prorated = ProrationCalculator.calculateUpgradeProration(
            new Money(oldPrice, 'USD'),
            new Money(newPrice, 'USD'),
            0,
          );

          expect(prorated.getAmount()).toBe(0);
        },
      ),
    );
  });
});
