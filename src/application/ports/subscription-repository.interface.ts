import { Subscription } from '../../domain/entities/subscription.entity';

export interface ISubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  saveWithOutbox(
    subscription: Subscription,
    eventType: string,
    payload: Record<string, any>,
  ): Promise<void>;
}
