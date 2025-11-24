import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BusinessInfoRepository } from '../business-info.repository.interface';
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
