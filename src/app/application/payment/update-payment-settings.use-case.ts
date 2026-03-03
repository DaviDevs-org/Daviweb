import { Injectable } from '@angular/core';
import { PaymentRepository } from './payment.repository.interface';

@Injectable({ providedIn: 'root' })
export class UpdatePaymentSettingsUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(settings: {
    prePaymentPolicy: string;
    prePaymentValue: number;
  }): Promise<void> {
    return await this.paymentRepository.updatePaymentSettings(settings);
  }
}
