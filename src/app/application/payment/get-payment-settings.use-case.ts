import { Injectable } from "@angular/core";
import { PaymentRepository } from "@application/payment/payment.repository.interface";
import { Observable } from "rxjs";

@Injectable({  providedIn: 'root'
})
export class GetPaymentSettingsUseCase {
    constructor(private readonly paymentRepository: PaymentRepository) {}

    execute(): Observable<any> {
        return this.paymentRepository.getPaymentSettings();
    }
}