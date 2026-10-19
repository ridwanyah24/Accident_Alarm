import { NotificationChannel } from '@accident-alarm/api-contracts';

export interface DeliveryResult {
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface INotificationProvider {
  channel: NotificationChannel;
  send(payload: {
    recipientId?: string | null;
    incidentId?: string | null;
    eventType: string;
    title: string;
    body: string;
  }): Promise<DeliveryResult>;
}

export class SimulatedInAppProvider implements INotificationProvider {
  channel = NotificationChannel.IN_APP;

  async send(payload: { recipientId?: string | null; incidentId?: string | null; eventType: string; title: string; body: string }): Promise<DeliveryResult> {
    // Deliver internal operational alert
    console.log(`[Notification: IN_APP] [${payload.eventType}] ${payload.title} - ${payload.body}`);
    return {
      success: true,
      providerMessageId: `inapp-${Date.now()}`
    };
  }
}

export class SimulatedFCMProvider implements INotificationProvider {
  channel = NotificationChannel.FCM;

  async send(payload: { recipientId?: string | null; incidentId?: string | null; eventType: string; title: string; body: string }): Promise<DeliveryResult> {
    console.log(`[Notification: FCM (SIMULATED)] Sent push alert to recipient '${payload.recipientId || 'Duty Queue'}': "${payload.title}"`);
    return {
      success: true,
      providerMessageId: `fcm-sim-${Math.random().toString(36).substring(2, 10)}`
    };
  }
}

export class SimulatedSMSProvider implements INotificationProvider {
  channel = NotificationChannel.SMS;

  async send(payload: { recipientId?: string | null; incidentId?: string | null; eventType: string; title: string; body: string }): Promise<DeliveryResult> {
    console.log(`[Notification: SMS (SIMULATED)] Sent SMS message: "${payload.body}"`);
    return {
      success: true,
      providerMessageId: `sms-sim-${Math.random().toString(36).substring(2, 10)}`
    };
  }
}

export class SimulatedEmailProvider implements INotificationProvider {
  channel = NotificationChannel.EMAIL;

  async send(payload: { recipientId?: string | null; incidentId?: string | null; eventType: string; title: string; body: string }): Promise<DeliveryResult> {
    console.log(`[Notification: EMAIL (SIMULATED)] Sent email alert: "${payload.title}"`);
    return {
      success: true,
      providerMessageId: `email-sim-${Math.random().toString(36).substring(2, 10)}`
    };
  }
}
