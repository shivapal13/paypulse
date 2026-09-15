import { SubscriptionCronProcessor } from "./subscription-cron.jobs";
import { PlanTier } from "../../domain/enums/plan-tier.enums";
import { DomainError } from "../../domain/errors/domain.erros";


describe('subscriptionCronProcessor',()=>{
    let processor:SubscriptionCronProcessor;
    let mockPrisma:any;
    let mockRepository:any;
    let mockStripeClient:any;

    beforeEach(()=>{
        mockPrisma={
            subscription:{
                findMany:jest.fn(),
            },
        };
        
        mockRepository={
            saveWithOutbox:jest.fn().mockResolvedValue(undefined),
        };

        mockStripeClient={
            chargeCard:jest.fn(),
        };

        processor=new SubscriptionCronProcessor(
            mockPrisma,
            mockRepository,
            mockStripeClient
        )
    });
    // test for payment success
    it('should charge card, extend renewal date ,and save subscription.renewed when payment succeeds',async()=>{
        const dueSub={
            id:'sub-due-1',
            userId:'user-1',
            planTier:PlanTier.PRO,
            priceAmount:30,
            currency:'USD',
            status:'ACTIVE',
            retryCount:0,
            nextRenewalDate:new Date('2026-09-01'),
        };

        mockPrisma.subscription.findMany.mockResolvedValue([dueSub]);
        mockStripeClient.chargeCard.mockResolvedValue({id:'ch_123',status:'succeeded'});

        const processesdCount=await processor.processDueRenewals();

        expect(processesdCount).toBe(1);
        expect(mockStripeClient.chargeCard).toHaveBeenCalledWith('pm_card_visa',30);

        expect(mockRepository.saveWithOutbox.mock.calls[0][1]).toBe('subscription.renewed',)
    });

    // test for payment failure (Card Declined)

    it('should mark subscription as PAST_DUE and save subscription.past_due when payment fails', async()=>{
        const dueSub={
            id:'sub-due-2',
            userId:'user-2',
            planTier:PlanTier.BASIC,
            priceAmount:10,
            currency:'USD',
            status:"ACTIVE",
            retryCount:0,
            nextRenewalDate:new Date('2026-09-01'),
        };
        
        mockPrisma.subscription.findMany.mockResolvedValue([dueSub]);
        mockStripeClient.chargeCard.mockRejectedValue(new DomainError('card declined'));

        const processedCount=await processor.processDueRenewals();

        expect(processedCount).toBe(1);
        expect(mockStripeClient.chargeCard).toHaveBeenCalledWith('pm_card_visa',10);

        expect(mockRepository.saveWithOutbox.mock.calls[0][1]).toBe('subscription.past_due');
    });

    it('should cancel subscription that exceeded 3 past_due retries',async()=>{
        const expiredSub={
           id:'sub-exp-1',
           userId:'user-3',
           planTier:PlanTier.BASIC,
           priceAmount:10,
           currency:'USD',
           status:'PAST_DUE',
           retryCount:3,
           nextRenewalDate:new Date('2026-09-01',)
        };

        mockPrisma.subscription.findMany.mockResolvedValue([expiredSub]);

        const cancelledCount=await processor.processExpireGracePeroids();

        expect(cancelledCount).toBe(1);

        expect(mockRepository.saveWithOutbox.mock.calls[0][1]).toBe('subscription.cancelled')
    });
});
