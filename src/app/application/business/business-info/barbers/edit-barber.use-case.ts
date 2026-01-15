import { Injectable } from '@angular/core';
import { BusinessInfoRepository } from '@application/business';
import {Barber} from '@domain/index';

@Injectable({
  providedIn: 'root'
})
export class EditBarberUseCase {
  constructor(private readonly businessInfoRepository: BusinessInfoRepository) {}

  execute(newBarber: Barber): Promise<void> {
    return this.businessInfoRepository.editBarber(newBarber);
  }
}
