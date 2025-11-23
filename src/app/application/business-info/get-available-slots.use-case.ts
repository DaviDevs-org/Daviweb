import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BusinessInfoRepository } from './business-info.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class GetAvailableSlotsUseCase {
  constructor(private readonly businessInfoRepository: BusinessInfoRepository) {}

  execute(date: Date, serviceDuration: number): Observable<string[]> {
    // Validación: fecha válida
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('La fecha proporcionada no es válida');
    }

    // Validación: duración del servicio debe ser mayor que 0
    if (serviceDuration <= 0) {
      throw new Error('La duración del servicio debe ser mayor que 0');
    }

    // Validación: duración del servicio debe ser un número entero positivo
    if (!Number.isInteger(serviceDuration)) {
      throw new Error('La duración del servicio debe ser un número entero');
    }

    return this.businessInfoRepository.getAvailableSlots(date, serviceDuration);
  }
}
