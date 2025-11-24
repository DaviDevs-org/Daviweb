import { Injectable } from '@angular/core';
import { BusinessInfoRepository } from '@application/business-info';
import {Barber} from '@domain/index';

@Injectable({
  providedIn: 'root'
})
export class EditBarberUseCase {
  constructor(private readonly businessInfoRepository: BusinessInfoRepository) {}

  execute(oldBarber: Barber, newBarber: Barber): Promise<void> {
    return this.businessInfoRepository.editBarber(oldBarber, newBarber);
  }
}
