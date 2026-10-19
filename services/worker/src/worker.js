"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationWorker = exports.NotificationWorker = void 0;
const api_contracts_1 = require("@accident-alarm/api-contracts");
const db_1 = require("../../api/src/db");
const backoff_1 = require("./backoff");
const channel_adapters_1 = require("./providers/channel-adapters");
class NotificationWorker {
    isRunning = false;
    intervalId = null;
    providers = new Map();
    constructor() {
        this.registerProvider(new channel_adapters_1.SimulatedInAppProvider());
        this.registerProvider(new channel_adapters_1.SimulatedFCMProvider());
        this.registerProvider(new channel_adapters_1.SimulatedSMSProvider());
        this.registerProvider(new channel_adapters_1.SimulatedEmailProvider());
    }
    registerProvider(provider) {
        this.providers.set(provider.channel, provider);
    }
    async processPendingOutbox() {
        const store = (0, db_1.getDbStore)();
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
                    status: api_contracts_1.DeliveryStatus.FAILED,
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
                        status: api_contracts_1.DeliveryStatus.DELIVERED,
                        attemptCount: attempt,
                        providerMessageId: result.providerMessageId || null,
                        sentAt: new Date(),
                        deliveredAt: new Date(),
                        nextAttemptAt: null,
                        lastErrorCode: null
                    });
                    processedCount++;
                }
                else {
                    await this.handleFailure(delivery.id, attempt, result.errorCode || 'DELIVERY_REJECTED');
                }
            }
            catch (err) {
                await this.handleFailure(delivery.id, attempt, err.message || 'UNEXPECTED_DELIVERY_ERROR');
            }
        }
        return processedCount;
    }
    async handleFailure(deliveryId, attempt, errorCode) {
        const store = (0, db_1.getDbStore)();
        if ((0, backoff_1.isExhausted)(attempt)) {
            console.error(`[NotificationWorker] Delivery ${deliveryId} permanently FAILED after ${attempt} attempts (Dead-Letter). Error: ${errorCode}`);
            await store.updateNotificationDelivery(deliveryId, {
                status: api_contracts_1.DeliveryStatus.FAILED,
                attemptCount: attempt,
                nextAttemptAt: null,
                lastErrorCode: `DEAD_LETTER: ${errorCode}`
            });
        }
        else {
            const backoffDelay = (0, backoff_1.calculateBackoffDelay)(attempt);
            console.warn(`[NotificationWorker] Delivery ${deliveryId} failed attempt ${attempt}. Retrying in ${backoffDelay}ms. Error: ${errorCode}`);
            await store.updateNotificationDelivery(deliveryId, {
                status: api_contracts_1.DeliveryStatus.FAILED,
                attemptCount: attempt,
                nextAttemptAt: new Date(Date.now() + backoffDelay),
                lastErrorCode: errorCode
            });
        }
    }
    start(intervalMs = 3000) {
        if (this.isRunning)
            return;
        this.isRunning = true;
        console.log('[NotificationWorker] Background notification worker started.');
        this.intervalId = setInterval(async () => {
            try {
                await this.processPendingOutbox();
            }
            catch (err) {
                console.error('[NotificationWorker Error] Exception in poll loop:', err);
            }
        }, intervalMs);
    }
    stop() {
        if (!this.isRunning)
            return;
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('[NotificationWorker] Background notification worker stopped.');
    }
}
exports.NotificationWorker = NotificationWorker;
exports.notificationWorker = new NotificationWorker();
if (require.main === module) {
    exports.notificationWorker.start(3000);
    const shutdown = () => {
        exports.notificationWorker.stop();
        process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
