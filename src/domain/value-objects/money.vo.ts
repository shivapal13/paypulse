import { DomainError } from '../errors/domain.erros';

export class Money {
  private readonly amount: number;
  private readonly currency: string;

  constructor(amount: number, currency: string = 'USD') {
    if (amount < 0) {
      throw new DomainError('Money amount cannot be negative');
    }

    if (Number.isNaN(amount) || amount < 0) {
      throw new DomainError('Money must ne a valid positive number');
    }

    this.amount = Math.round(amount * 100) / 100;
    this.currency = currency;
  }

  getAmount(): number {
    return this.amount;
  }

  getCurrency(): string {
    return this.currency;
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new DomainError('currreny mismatch');
    } else {
      return new Money(this.amount + other.amount, this.currency);
    }
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new DomainError('curreny mismatch');
    }

    if (this.amount < other.amount) {
      throw new DomainError('Insufficient balance');
    }
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new DomainError('factor cannot ne negative');
    }
    return new Money(this.amount * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
