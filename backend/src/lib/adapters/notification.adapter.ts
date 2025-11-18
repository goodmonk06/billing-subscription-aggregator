/**
 * Notification Adapter Interface
 *
 * Implement this interface to send notifications via different channels
 * (email, SMS, push notifications, etc.)
 */

export interface NotificationRecipient {
  email?: string;
  phone?: string;
  userId?: string;
  name?: string;
}

export interface NotificationPayload {
  subject?: string;
  message: string;
  templateId?: string;
  templateData?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface INotificationAdapter {
  /**
   * Send an email notification
   */
  sendEmail(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
  ): Promise<{ success: boolean; messageId?: string }>;

  /**
   * Send an SMS notification
   */
  sendSMS(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
  ): Promise<{ success: boolean; messageId?: string }>;

  /**
   * Send a push notification
   */
  sendPush(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
  ): Promise<{ success: boolean; messageId?: string }>;

  /**
   * Send invoice email with PDF attachment
   */
  sendInvoice(
    recipient: NotificationRecipient,
    invoiceData: {
      invoiceId: string;
      invoiceNumber: string;
      amount: number;
      currency: string;
      dueDate?: Date;
      pdfUrl?: string;
    },
  ): Promise<{ success: boolean; messageId?: string }>;

  /**
   * Send payment failure notification
   */
  sendPaymentFailure(
    recipient: NotificationRecipient,
    failureData: {
      amount: number;
      currency: string;
      reason: string;
      retryDate?: Date;
    },
  ): Promise<{ success: boolean; messageId?: string }>;
}

/**
 * In-memory stub implementation for development
 */
export class InMemoryNotificationAdapter implements INotificationAdapter {
  private readonly sentNotifications: Array<{
    type: string;
    recipient: NotificationRecipient;
    payload: any;
    timestamp: Date;
  }> = [];

  async sendEmail(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
  ): Promise<{ success: boolean; messageId?: string }> {
    this.sentNotifications.push({
      type: 'email',
      recipient,
      payload,
      timestamp: new Date(),
    });
    console.log(`[Email] To: ${recipient.email}, Subject: ${payload.subject}`);
    return { success: true, messageId: `email-${Date.now()}` };
  }

  async sendSMS(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
  ): Promise<{ success: boolean; messageId?: string }> {
    this.sentNotifications.push({
      type: 'sms',
      recipient,
      payload,
      timestamp: new Date(),
    });
    console.log(`[SMS] To: ${recipient.phone}, Message: ${payload.message}`);
    return { success: true, messageId: `sms-${Date.now()}` };
  }

  async sendPush(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
  ): Promise<{ success: boolean; messageId?: string }> {
    this.sentNotifications.push({
      type: 'push',
      recipient,
      payload,
      timestamp: new Date(),
    });
    console.log(`[Push] To: ${recipient.userId}, Message: ${payload.message}`);
    return { success: boolean; messageId: `push-${Date.now()}` };
  }

  async sendInvoice(
    recipient: NotificationRecipient,
    invoiceData: any,
  ): Promise<{ success: boolean; messageId?: string }> {
    this.sentNotifications.push({
      type: 'invoice',
      recipient,
      payload: invoiceData,
      timestamp: new Date(),
    });
    console.log(
      `[Invoice] To: ${recipient.email}, Invoice: ${invoiceData.invoiceNumber}`,
    );
    return { success: true, messageId: `invoice-${Date.now()}` };
  }

  async sendPaymentFailure(
    recipient: NotificationRecipient,
    failureData: any,
  ): Promise<{ success: boolean; messageId?: string }> {
    this.sentNotifications.push({
      type: 'payment_failure',
      recipient,
      payload: failureData,
      timestamp: new Date(),
    });
    console.log(
      `[Payment Failure] To: ${recipient.email}, Amount: ${failureData.amount}`,
    );
    return { success: true, messageId: `failure-${Date.now()}` };
  }

  getSentNotifications() {
    return this.sentNotifications;
  }

  clear() {
    this.sentNotifications.length = 0;
  }
}
