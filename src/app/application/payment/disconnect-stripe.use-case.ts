import { Injectable } from "@angular/core";
import { PaymentRepository } from "./payment.repository.interface";


@Injectable({  providedIn: 'root'
})
export class DisconnectStripeUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  execute(): Promise<void> {
    return this.paymentRepository.disconnectStripe();
  }
}