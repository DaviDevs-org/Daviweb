import { Injectable } from '@angular/core';
import { BusinessInfoRepository } from '@application/business-info';
import {Barber} from '@domain/index';

@Injectable({
  providedIn: 'root'
})
export class UpdateBarberSelectionUseCase {
  constructor(private readonly businessInfoRepository: BusinessInfoRepository) {}

  execute(state: boolean): Promise<void> {
    return this.businessInfoRepository.updateBarberSelection(state);
  }
}
