import axios from 'axios';
import { SmsRepository } from '../domain/sms.repository';

export class MoceanAdapter implements SmsRepository {
  private readonly apiUrl = 'https://rest.moceanapi.com/rest/2/sms';
  private readonly apiToken: string;
  private readonly fromName: string;

  constructor(apiToken: string, fromName: string) {
    this.apiToken = apiToken;
    this.fromName = this.normalizeFromName(fromName || 'Peluqueria');
  }

  private normalizeFromName(raw: string): string {
    const candidate = (raw || '')
      .trim()
      // Most SMS providers are strict with sender IDs: alphanumeric only
      .replace(/[^a-zA-Z0-9]/g, '');

    const maxAlphaSenderLength = 11;
    const trimmed = candidate.slice(0, maxAlphaSenderLength);
    return trimmed || 'Peluqueria';
  }

  async sendSms(phoneNumber: string, message: string): Promise<void> {
    try {
      const to = phoneNumber.replace(/\D/g, '');
      if (!to) {
        throw new Error(`Invalid phoneNumber for SMS (empty after normalization): ${phoneNumber}`);
      }

      const formData = new URLSearchParams({
        'mocean-from': this.fromName,
        'mocean-to': to,
        'mocean-text': message,
        'mocean-resp-format': 'json',
      });

      const response = await axios.post(this.apiUrl, formData.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log('📝 Respuesta MoceanAPI:', JSON.stringify(response.data));

      if (response.data.messages && response.data.messages[0]) {
        if (response.data.messages[0].status !== 0) {
          throw new Error(
            `MoceanAPI error: ${response.data.messages[0].err_msg || 'Unknown error'}`,
          );
        }
      }

      console.log(`✅ SMS enviado a ${phoneNumber}`);
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        console.error('❌ Error MoceanAPI response:', JSON.stringify({ status, data }));

        const errMsg =
          data?.messages?.[0]?.err_msg ||
          data?.messages?.[0]?.status_desc ||
          data?.err_msg;

        if (errMsg) {
          throw new Error(`MoceanAPI HTTP ${status}: ${errMsg}`);
        }
      }
      console.error('❌ Error enviando SMS:', error);
      throw error;
    }
  }
}
