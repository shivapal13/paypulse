import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { CreateSubscription } from '../../application/services/create-subscription.service';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly createSubscription: CreateSubscription) {}

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateSubscriptionDto) {
    return await this.createSubscription.execute(dto);
  }
}
