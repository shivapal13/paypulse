import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const handlers = [
  rest.post('https://api.stripe.com/v1/charges', async (req, res, ctx) => {
    const body = (await req.json()) as any;

    // 1: Simulated Declined Card
    if (body?.paymentMethodId === 'pm_card_declined') {
      return res(ctx.status(402), ctx.json({ message: 'Card Declined' }));
    }

    // 2: Successful Payment
    return res(
      ctx.status(200),
      ctx.json({
        id: 'ch_mock_999',
        status: 'succeeded',
        amount: body?.amount,
        currency: body?.currency,
      }),
    );
  }),
];

export const mswServer = setupServer(...handlers);
