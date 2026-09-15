import { Worker, Job } from 'bullmq';

export type httpPostFn = (url: string, body: any) => Promise<{ status: number }>;

export class WebhookProcessor {
  private worker: Worker;
  constructor(
    connectionOptions: { host: string; port: number },
    private readonly httpPostFn: httpPostFn,
  ) {
  
    this.worker = new Worker(
      'webhook-queue',
      async (job: Job) => {
        const { eventType, payload, webhookurl } = job.data;

        const response = await this.httpPostFn(webhookurl, {
          eventType,
          payload,
        });

        if (response.status < 200 || response.status >= 300) {
          throw new Error(`webhook Delivery failed with http status ${response.status}`);
        }
        return { success: true };
      },
      { connection: connectionOptions },
    );
    this.worker.on('failed', (job, err) => {
      console.error(
        `DLQ ALERT: Webhook Job ${job?.id} (Event: ${job?.data?.eventType}) failed after all retries! Reason: ${err.message}`,
      );
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
