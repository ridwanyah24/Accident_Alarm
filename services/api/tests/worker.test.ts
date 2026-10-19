import { calculateBackoffDelay, isExhausted, defaultBackoffConfig } from '../../worker/src/backoff';
import { NotificationWorker } from '../../worker/src/worker';
import { getDbStore } from '../src/db';
import { NotificationChannel, DeliveryStatus } from '@accident-alarm/api-contracts';
import { INotificationProvider } from '../../worker/src/providers/channel-adapters';

describe('Notification Outbox & Worker Retry Tests', () => {
  const store = getDbStore();

  beforeEach(async () => {
    await store.reset();
  });

  describe('Bounded Exponential Backoff Calculations', () => {
    it('FR-10: Calculates correct exponential delay for retries', () => {
      // Attempt 1: base delay ~1000ms + jitter
      const delay1 = calculateBackoffDelay(1);
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(1200);

      // Attempt 2: base * 2 = 2000ms + jitter
      const delay2 = calculateBackoffDelay(2);
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(2300);

      // Attempt 3: base * 4 = 4000ms + jitter
      const delay3 = calculateBackoffDelay(3);
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThanOrEqual(4500);
    });

    it('NFR-05: Bounds maximum delay to 60,000ms', () => {
      const delay10 = calculateBackoffDelay(10);
      expect(delay10).toBeLessThanOrEqual(defaultBackoffConfig.maxDelayMs * 1.15);
    });

    it('FR-10: Detects exhausted retries after max attempts (5)', () => {
      expect(isExhausted(1)).toBe(false);
      expect(isExhausted(4)).toBe(false);
      expect(isExhausted(5)).toBe(true);
      expect(isExhausted(6)).toBe(true);
    });
  });

  describe('Outbox Queue Processing', () => {
    it('FR-10: Worker processes queued notification delivery and marks DELIVERED', async () => {
      // Create a queued notification in outbox
      const delivery = await store.createNotificationDelivery({
        incidentId: null,
        recipientUserId: null,
        channel: NotificationChannel.IN_APP,
        eventType: 'TEST_DISPATCH_ALERT',
        providerMessageId: null,
        status: DeliveryStatus.QUEUED,
        lastErrorCode: null
      });

      const worker = new NotificationWorker();
      const processed = await worker.processPendingOutbox();
      expect(processed).toBe(1);

      const updatedList = await store.listNotificationDeliveries();
      const updated = updatedList.find(d => d.id === delivery.id);
      expect(updated).toBeDefined();
      expect(updated?.status).toBe(DeliveryStatus.DELIVERED);
      expect(updated?.attemptCount).toBe(1);
      expect(updated?.deliveredAt).toBeDefined();
    });

    it('does not retry a failed delivery until its backoff deadline', async () => {
      const delivery = await store.createNotificationDelivery({
        incidentId: null,
        recipientUserId: null,
        channel: NotificationChannel.IN_APP,
        eventType: 'TEST_RETRY_DELAY',
        providerMessageId: null,
        status: DeliveryStatus.QUEUED,
        lastErrorCode: null
      });
      const failingProvider: INotificationProvider = {
        channel: NotificationChannel.IN_APP,
        async send() {
          return { success: false, errorCode: 'TEMPORARY_FAILURE' };
        }
      };
      const worker = new NotificationWorker();
      worker.registerProvider(failingProvider);

      await worker.processPendingOutbox();

      const updated = (await store.listNotificationDeliveries()).find(item => item.id === delivery.id);
      expect(updated?.status).toBe(DeliveryStatus.FAILED);
      expect(updated?.attemptCount).toBe(1);
      expect(updated?.nextAttemptAt?.getTime()).toBeGreaterThan(Date.now());
      expect(await worker.processPendingOutbox()).toBe(0);
    });
  });
});
