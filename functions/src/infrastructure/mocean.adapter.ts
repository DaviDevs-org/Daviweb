import axios from 'axios';
import { SmsRepository } from '../domain/sms.repository';

export class MoceanAdapter implements SmsRepository {
  private readonly apiUrl = 'https://rest.moceanapi.com/rest/2/sms';
  private readonly apiToken: string;
  private readonly fromName: string;

  constructor() {
    this.apiToken = process.env.MOCEAN_API_KEY || '';
    this.fromName = 'PeluqueriApp';
  }

  async sendSms(phoneNumber: string, message: string): Promise<void> {
    try {
      const formData = new URLSearchParams({
        'mocean-from': this.fromName,
        'mocean-to': phoneNumber.replace('+', ''),
        'mocean-text': message,
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
        console.error(
          '❌ Error MoceanAPI response:',
          JSON.stringify(error.response.data),
        );
      }
      console.error('❌ Error enviando SMS:', error);
      throw error;
    }
  }
}
