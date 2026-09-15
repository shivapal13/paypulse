import { DomainError } from '../errors/domain.erros';
import { Money } from './money.vo';

describe('Money Value Object', () => {
  it('should create a valid Money Object', () => {
    const money = new Money(100, 'USD');

    expect(money.getAmount()).toBe(100);
    expect(money.getCurrency()).toBe('USD');
  });

  it('Should throw DomainError when amount is negative', () => {
    expect(() => new Money(-50)).toThrow(DomainError);
  });

  it('should add two money object with the same currency', () => {
    const m1 = new Money(10, 'USD');
    const m2 = new Money(20, 'USD');

    const result = m1.add(m2);

    expect(result.getAmount()).toBe(30);
  });

  it('should subtract the money objects correctly', () => {
    const m1 = new Money(50, 'USD');
    const m2 = new Money(20, 'USD');

    const result = m1.subtract(m2);

    expect(result.getAmount()).toBe(30);
  });

  it('should throw DomainError when adding diff currencies', () => {
    const usd = new Money(10, 'USD');
    const eur = new Money(10, 'EUR');

    expect(() => usd.add(eur)).toThrow(DomainError);
  });
});
