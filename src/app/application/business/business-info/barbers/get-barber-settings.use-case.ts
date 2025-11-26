import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BusinessInfoRepository } from '@application/business';
import { BarberSettings } from '@domain/index';

@Injectable({
  providedIn: 'root'
})
export class GetBarberSettingsUseCase {
  constructor(private readonly businessInfoRepository: BusinessInfoRepository) {}

  execute(): Observable<BarberSettings> {
    return this.businessInfoRepository.getBarberSettings();
  }
}
