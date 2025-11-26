import { Injectable } from '@angular/core';
import { BusinessInfoRepository } from '@application/business';
import {Barber} from '@domain/index';

@Injectable({
  providedIn: 'root'
})
export class AddBarberUseCase {
  constructor(private readonly businessInfoRepository: BusinessInfoRepository) {}

  execute(barber: Barber): Promise<void> {
    return this.businessInfoRepository.addBarber(barber);
  }
}
