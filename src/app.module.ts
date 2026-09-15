import { Module } from '@nestjs/common';
import { SubscriptionController } from './presentation/controllers/subscriptions.controller';
import { CreateSubscription } from './application/services/create-subscription.service';
import { PrismaService } from './infrastructure/database/prisma.service';
import { StripePaymentClient } from './infrastructure/payment/stripe-payment.client';
import { PrismaSubscriptionRepository } from './infrastructure/database/repositories/prisma-subscription.repository';
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports:[],
  controllers:[SubscriptionController,HealthController],
  providers:[
    PrismaService,
    CreateSubscription,
    StripePaymentClient,
    PrismaSubscriptionRepository
  ],
})

export class AppModule {}