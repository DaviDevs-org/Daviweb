import { Appointment } from '@domain/index';
import { Injectable } from '@angular/core';
import { BookingStrategyFactory } from './strategies/booking-strategy.factory';
import { GetBarberSettingsUseCase } from '@application/business';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AddAppointmentUseCase {
  constructor(
    private strategyFactory: BookingStrategyFactory,
    private getBarberSettingsUseCase: GetBarberSettingsUseCase
  ) {}

  async execute(appointment: Appointment): Promise<void> {
    // 1. Determine strategy
    const settings = await firstValueFrom(this.getBarberSettingsUseCase.execute());
    const strategy = this.strategyFactory.getStrategy(settings.barberSelection);

    // 2. Execute strategy
    await strategy.execute(appointment);
  }
}
