import { Injectable } from '@nestjs/common';
import { DomainError } from '../../domain/errors/domain.erros';

@Injectable()
export class StripePaymentClient {
  private readonly baseurl: string = 'https://api.stripe.com';

  async chargeCard(
    paymentMethodId: string,
    amount: number,
    currency: string = 'USD',
  ): Promise<{ id: string; status: string }> {
    const response = await fetch(`${this.baseurl}/v1/charges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethodId,
        amount,
        currency,
      }),
    });

    if (!response.ok) {
      throw new DomainError(`Payment failed failed with status: ${response.status}`);
    }

    return (await response.json()) as { id: string; status: string };
  }
}
