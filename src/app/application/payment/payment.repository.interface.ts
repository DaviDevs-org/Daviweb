import { Observable } from 'rxjs';

export abstract class PaymentRepository {
  abstract getPaymentSettings(): Observable<any>;
  abstract updatePaymentSettings(settings: any): Promise<void>;
  abstract disconnectStripe(): Promise<void>;
  abstract createPaymentIntent(serviceId: string, tenantId: string, hairLength?: string): Promise<{ clientSecret: string; amount: number; stripeAccountId?: string }>;
}