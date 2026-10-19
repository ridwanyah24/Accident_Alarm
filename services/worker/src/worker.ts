import { DeliveryStatus, NotificationChannel } from '@accident-alarm/api-contracts';
import { getDbStore } from '../../api/src/db';
import { calculateBackoffDelay, isExhausted } from './backoff';
import {
  INotificationProvider,
  SimulatedInAppProvider,
  SimulatedFCMProvider,
  SimulatedSMSProvider,
  SimulatedEmailProvider
} from './providers/channel-adapters';

export class NotificationWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private providers: Map<NotificationChannel, INotificationProvider> = new Map();

  constructor() {
    this.registerProvider(new SimulatedInAppProvider());
    this.registerProvider(new SimulatedFCMProvider());
    this.registerProvider(new SimulatedSMSProvider());
    this.registerProvider(new SimulatedEmailProvider());
  }

  registerProvider(provider: INotificationProvider): void {
    this.providers.set(provider.channel, provider);
  }

  async processPendingOutbox(): Promise<number> {
    const store = getDbStore();
    const pendingDeliveries = await store.listPendingNotificationDeliveries(10);

    if (pendingDeliveries.length === 0) {
      return 0;
    }

    let processedCount = 0;

    for (const delivery of pendingDeliveries) {
      const provider = this.providers.get(delivery.channel);
      if (!provider) {
        console.warn(`[NotificationWorker] No provider registered for channel: ${delivery.channel}`);
        await store.updateNotificationDelivery(delivery.id, {
          status: DeliveryStatus.FAILED,
          lastErrorCode: 'NO_PROVIDER_REGISTERED'
        });
        continue;
      }

      // Fetch incident context if present
      let incidentRef = 'N/A';
      if (delivery.incidentId) {
        const incident = await store.findIncidentById(delivery.incidentId);
        if (incident) {
          incidentRef = incident.referenceCode;
        }
      }

      const attempt = delivery.attemptCount + 1;

      try {
        const result = await provider.send({
          recipientId: delivery.recipientUserId,
          incidentId: delivery.incidentId,
          eventType: delivery.eventType,
          title: `Emergency Alert: [${incidentRef}] ${delivery.eventType}`,
          body: `An accident incident [${incidentRef}] has a status update or new assignment. Check the operations queue.`
        });

        if (result.success) {
          await store.updateNotificationDelivery(delivery.id, {
            status: DeliveryStatus.DELIVERED,
            attemptCount: attempt,
            providerMessageId: result.providerMessageId || null,
            sentAt: new Date(),
            deliveredAt: new Date(),
            nextAttemptAt: null,
            lastErrorCode: null
          });
          processedCount++;
        } else {
          await this.handleFailure(delivery.id, attempt, result.errorCode || 'DELIVERY_REJECTED');
        }
      } catch (err: any) {
        await this.handleFailure(delivery.id, attempt, err.message || 'UNEXPECTED_DELIVERY_ERROR');
      }
    }

    return processedCount;
  }

  private async handleFailure(deliveryId: string, attempt: number, errorCode: string): Promise<void> {
    const store = getDbStore();
    if (isExhausted(attempt)) {
      console.error(`[NotificationWorker] Delivery ${deliveryId} permanently FAILED after ${attempt} attempts (Dead-Letter). Error: ${errorCode}`);
      await store.updateNotificationDelivery(deliveryId, {
        status: DeliveryStatus.FAILED,
        attemptCount: attempt,
        nextAttemptAt: null,
        lastErrorCode: `DEAD_LETTER: ${errorCode}`
      });
    } else {
      const backoffDelay = calculateBackoffDelay(attempt);
      console.warn(`[NotificationWorker] Delivery ${deliveryId} failed attempt ${attempt}. Retrying in ${backoffDelay}ms. Error: ${errorCode}`);
      await store.updateNotificationDelivery(deliveryId, {
        status: DeliveryStatus.FAILED,
        attemptCount: attempt,
        nextAttemptAt: new Date(Date.now() + backoffDelay),
        lastErrorCode: errorCode
      });
    }
  }

  start(intervalMs = 3000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[NotificationWorker] Background notification worker started.');

    this.intervalId = setInterval(async () => {
      try {
        await this.processPendingOutbox();
      } catch (err) {
        console.error('[NotificationWorker Error] Exception in poll loop:', err);
      }
    }, intervalMs);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[NotificationWorker] Background notification worker stopped.');
  }
}

export const notificationWorker = new NotificationWorker();

if (require.main === module) {
  notificationWorker.start(3000);

  const shutdown = () => {
    notificationWorker.stop();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
