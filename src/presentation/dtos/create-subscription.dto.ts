import { IsString, IsNotEmpty, IsEmail, IsEnum } from 'class-validator';
import { PlanTier } from '../../domain/enums/plan-tier.enums';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(PlanTier)
  @IsNotEmpty()
  planTier: PlanTier;

  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;
}
