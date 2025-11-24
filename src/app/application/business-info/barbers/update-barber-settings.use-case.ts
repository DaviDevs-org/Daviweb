import { Injectable } from '@angular/core';
import { BusinessInfoRepository } from '@application/business-info';
import {BarberSettings} from '@domain/index';

@Injectable({
  providedIn: 'root'
})
export class UpdateBarberSettingsUseCase {
  constructor(private readonly businessInfoRepository: BusinessInfoRepository) {}

  execute(barberSettings: BarberSettings): Promise<void> {
    return this.businessInfoRepository.updateBarberSettings(barberSettings);
  }
}
