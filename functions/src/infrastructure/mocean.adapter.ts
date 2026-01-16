import axios from 'axios';
import { SmsRepository } from '../domain/sms.repository';

// SmsRepository implementation using MoceanAPI
export class MoceanAdapter implements SmsRepository {
  private readonly apiUrl = 'https://api.moceanapi.com/rest/1/sms';
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly fromName: string;

  constructor() {
    // Lee secrets desde variables de entorno (Firebase Secrets)
    this.apiKey = process.env.MOCEAN_API_KEY || '';
    this.apiSecret = process.env.MOCEAN_API_SECRET || '';
    this.fromName = 'PeluqueriApp'; // Sender ID alfanumérico
  }

  async sendSms(phoneNumber: string, message: string): Promise<void> {
    try {
      const response = await axios.post(this.apiUrl, null, {
        params: {
          'mocean-api-key': this.apiKey,
          'mocean-api-secret': this.apiSecret,
          'mocean-to': phoneNumber,
          'mocean-from': this.fromName,
          'mocean-text': message,
        },
      });

      // Mocean devuelve status en response
      if (response.data.status !== '0') {
        throw new Error(
          `MoceanAPI error: ${response.data.err_msg || 'Unknown error'}`
        );
      }

      console.log(`✅ SMS enviado a ${phoneNumber}`);
    } catch (error) {
      console.error('❌ Error enviando SMS:', error);
      throw error; // Re-lanza para que Cloud Function lo maneje
    }
  }
}
