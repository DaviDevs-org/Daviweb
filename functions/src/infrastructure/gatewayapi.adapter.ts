import axios from 'axios';
import { SmsRepository } from '../domain/sms.repository';

export class GatewayApiAdapter implements SmsRepository {
  private readonly apiUrl = 'https://gatewayapi.com/rest/mtsms';
  private readonly apiToken: string;
  private readonly fromName: string;

  constructor(apiToken: string, fromName: string) {
    this.apiToken = apiToken;
    const originalName = fromName || 'Peluqueria';
    this.fromName = this.normalizeFromName(originalName);
    
    // Log sender normalization for debugging
    if (this.fromName !== originalName) {
      console.log(`📝 Sender normalizado: "${originalName}" → "${this.fromName}" (máx. 11 caracteres alfanuméricos)`);
    }
  }

  private normalizeFromName(raw: string): string {
    const candidate = (raw || '')
      .trim()
      // SMS Standard: Alphanumeric Sender ID limited to 11 characters (GSM restriction)
      .replace(/[^a-zA-Z0-9]/g, '');

    const maxAlphaSenderLength = 11;
    const trimmed = candidate.slice(0, maxAlphaSenderLength);
    return trimmed || 'Peluqueria';
  }

  async sendSms(phoneNumber: string, message: string): Promise<void> {
    try {
      // Normalize phone number: remove all non-digits including the + prefix
      // GatewayAPI expects MSISDN without + (e.g., 34600123456)
      const msisdn = phoneNumber.replace(/\D/g, '');
      if (!msisdn) {
        throw new Error(`Invalid phoneNumber for SMS (empty after normalization): ${phoneNumber}`);
      }

      const payload = {
        sender: this.fromName,
        message: message,
        recipients: [
          { msisdn: parseInt(msisdn, 10) },
        ],
        encoding: 'UCS2', // Unicode para soportar tildes y caracteres españoles (ñ, á, é, í, ó, ú)
      };

      console.log('📤 GatewayAPI Request:', {
        url: this.apiUrl,
        sender: payload.sender,
        msisdn: payload.recipients[0].msisdn,
        messageLength: message.length,
      });

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          Authorization: `Token ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📝 GatewayAPI Response:', JSON.stringify(response.data));

      // Success: HTTP 200 with ids array
      if (response.data.ids && response.data.ids.length > 0) {
        const smsId = response.data.ids[0];
        const cost = response.data.usage?.total_cost || 'N/A';
        const currency = response.data.usage?.currency || '';
        console.log(`✅ SMS enviado a ${phoneNumber} - ID: ${smsId} - Coste: ${cost} ${currency}`);
      } else {
        console.warn('⚠️ GatewayAPI returned 200 but no SMS IDs in response');
      }
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        console.error('❌ GatewayAPI Error Response:', JSON.stringify({ status, data }));

        // GatewayAPI error structure: { code, message, incident_uuid, variables }
        const errorCode = data?.code || 'UNKNOWN';
        const errorMessage = data?.message || 'Unknown error';
        const variables = data?.variables || [];

        // Replace %1, %2, etc. placeholders with actual values
        let formattedMessage = errorMessage;
        variables.forEach((value: any, index: number) => {
          formattedMessage = formattedMessage.replace(`%${index + 1}`, String(value));
        });

        throw new Error(`GatewayAPI HTTP ${status} [${errorCode}]: ${formattedMessage}`);
      }

      console.error('❌ Error enviando SMS:', error);
      throw error;
    }
  }
}
