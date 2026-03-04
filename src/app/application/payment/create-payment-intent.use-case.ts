import { Injectable } from "@angular/core";
import { PaymentRepository } from "./payment.repository.interface";


@Injectable({  providedIn: 'root'
})
export class CreatePaymentIntentUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  execute(serviceId: string, tenantId: string, hairLength?: string): Promise<{ clientSecret: string; amount: number; stripeAccountId?: string }> {
    return this.paymentRepository.createPaymentIntent(serviceId, tenantId, hairLength);
  }
}
