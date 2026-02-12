import { Appointment } from '@domain/index';
import { Injectable } from '@angular/core';
import { BookingStrategyFactory } from './strategies/booking-strategy.factory';
import { GetBarberSettingsUseCase } from '@application/business';
import { firstValueFrom } from 'rxjs';
import { BlacklistRepository } from '@application/blacklist/blacklist.repository.interface';

@Injectable({ providedIn: 'root' })
export class AddAppointmentUseCase {
  constructor(
    private strategyFactory: BookingStrategyFactory,
    private getBarberSettingsUseCase: GetBarberSettingsUseCase,
    private blacklistRepository: BlacklistRepository
  ) {}

  async execute(appointment: Appointment): Promise<void> {
    // 0. SECURITY CHECK: Blacklist
    if (appointment.phone) {
      const isBlocked = await this.blacklistRepository.isBlocked(appointment.phone);
      if (isBlocked) {
        // Error genérico silencioso para no dar pistas
         throw new Error('Error al procesar la solicitud. Por favor contacte con el establecimiento.');
      }
    }

    // 1. Determine strategy
    const settings = await firstValueFrom(this.getBarberSettingsUseCase.execute());
    const strategy = this.strategyFactory.getStrategy(settings.barberSelection);

    // 2. Execute strategy
    await strategy.execute(appointment);
  }
}
