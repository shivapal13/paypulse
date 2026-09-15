import { setupServer } from 'msw/node';
import {http,HttpResponse} from 'msw'

export const handlers=[
    http.post('https://api.stripe.com/v1/charges', async({request})=>{
           const body =(await request.json()) as any;

           if(body.paymentMethodId==='pm-_card_declined'){
            return new HttpResponse(null,{
                status:402,
                statusText:"Card Declined",
            });
           }


           return HttpResponse.json({
            id:'ch_mock_999',
            status:'succeeded',
            amount:body.amount,
            currency:body.currency
           });
    }),
];

export const mswServer=setupServer(...handlers);