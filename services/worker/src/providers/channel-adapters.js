"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulatedEmailProvider = exports.SimulatedSMSProvider = exports.SimulatedFCMProvider = exports.SimulatedInAppProvider = void 0;
const api_contracts_1 = require("@accident-alarm/api-contracts");
class SimulatedInAppProvider {
    channel = api_contracts_1.NotificationChannel.IN_APP;
    async send(payload) {
        // Deliver internal operational alert
        console.log(`[Notification: IN_APP] [${payload.eventType}] ${payload.title} - ${payload.body}`);
        return {
            success: true,
            providerMessageId: `inapp-${Date.now()}`
        };
    }
}
exports.SimulatedInAppProvider = SimulatedInAppProvider;
class SimulatedFCMProvider {
    channel = api_contracts_1.NotificationChannel.FCM;
    async send(payload) {
        console.log(`[Notification: FCM (SIMULATED)] Sent push alert to recipient '${payload.recipientId || 'Duty Queue'}': "${payload.title}"`);
        return {
            success: true,
            providerMessageId: `fcm-sim-${Math.random().toString(36).substring(2, 10)}`
        };
    }
}
exports.SimulatedFCMProvider = SimulatedFCMProvider;
class SimulatedSMSProvider {
    channel = api_contracts_1.NotificationChannel.SMS;
    async send(payload) {
        console.log(`[Notification: SMS (SIMULATED)] Sent SMS message: "${payload.body}"`);
        return {
            success: true,
            providerMessageId: `sms-sim-${Math.random().toString(36).substring(2, 10)}`
        };
    }
}
exports.SimulatedSMSProvider = SimulatedSMSProvider;
class SimulatedEmailProvider {
    channel = api_contracts_1.NotificationChannel.EMAIL;
    async send(payload) {
        console.log(`[Notification: EMAIL (SIMULATED)] Sent email alert: "${payload.title}"`);
        return {
            success: true,
            providerMessageId: `email-sim-${Math.random().toString(36).substring(2, 10)}`
        };
    }
}
exports.SimulatedEmailProvider = SimulatedEmailProvider;
