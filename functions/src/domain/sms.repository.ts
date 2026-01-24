/** Defines what the system does, not how */

export interface SmsRepository {
  /**
   * Sends an SMS message to a specified phone number.
   * @param phoneNumber The recipient's phone number.
   * @param message The message content to be sent.
   * @return A promise that resolves when the message is sent.
   */
  sendSms(phoneNumber: string, message: string): Promise<void>;
}
