import { PrismaSubscriptionRepository } from "../../infrastructure/database/repositories/prisma-subscription.repository";
import { Injectable } from "@nestjs/common";
import { CreateSubscriptionDto } from "../../presentation/dtos/create-subscription.dto";
import { StripePaymentClient } from "../../infrastructure/payment/stripe-payment.client";
import { PLAN_PRICES} from "../../domain/enums/plan-tier.enums";
import { randomUUID } from "crypto";
import { Money } from "../../domain/value-objects/money.vo";
import { Subscription } from "../../domain/entities/subscription.entity";

@Injectable()
export class CreateSubscription{
    constructor(
        private readonly repository:PrismaSubscriptionRepository,
        private  readonly stripeClient:StripePaymentClient
    ){}


    async execute(dto:CreateSubscriptionDto){
        const priceAmount=PLAN_PRICES[dto.planTier];

        await this.stripeClient.chargeCard(dto.paymentMethodId,priceAmount);

        const nextRenewalDate=new Date();
        nextRenewalDate.setDate(nextRenewalDate.getDate()+30);

        const subscription=new Subscription(
            randomUUID(),
            dto.userId,
            dto.planTier,
            new Money(priceAmount,'USD'),
            nextRenewalDate,
        );

        await this.repository.saveWithOutbox(subscription,'subscription.created',{
            subscriptionId:subscription.id,
            userId:subscription.userId,
        });

        return {
            subscriptionId:subscription.id,
            status:subscription.getStatus(),
        };
    }
}