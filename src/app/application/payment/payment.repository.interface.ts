import { Observable } from 'rxjs';

export abstract class PaymentRepository {
  abstract getPaymentSettings(): Observable<any>;
  abstract updatePaymentSettings(settings: any): Promise<void>;
  abstract disconnectStripe(): Promise<void>;
}