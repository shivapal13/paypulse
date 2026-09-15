import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class WebhookProducer {
  private webhookQueue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    redisConnectionoptions: { host: string; port: number },
  ) {
    this.webhookQueue = new Queue('webhook-queue', {
      connection: redisConnectionoptions,
    });
  }

  async processPendingEvents(): Promise<number> {
    const pendingEvents = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      take: 10,
    });

    let processCount = 0;

    for (const event of pendingEvents) {
      await this.webhookQueue.add(
        event.eventType,
        {
          eventId: event.id,
          eventType: event.eventType,
          payload: event.payload,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });

      processCount++;
    }
    return processCount;
  }

  async close(): Promise<void> {
    await this.webhookQueue.close();
  }
}
