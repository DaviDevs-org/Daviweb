import { Injectable } from '@angular/core';
import { BusinessInfoRepository } from './business-info.repository.interface';
import { ExceptionItem } from '@domain/index';

@Injectable({
  providedIn: 'root'
})
export class AddExceptionUseCase {
  constructor(private readonly businessInfoRepository: BusinessInfoRepository) {}

  async execute(exception: ExceptionItem): Promise<void> {
    // Validación: fecha requerida
    if (!exception.date || exception.date.trim().length === 0) {
      throw new Error('La excepción debe tener una fecha');
    }

    // Validación: si está abierto (no cerrado), debe tener intervalos
    if (!exception.closed && exception.intervals.length === 0) {
      throw new Error('Una excepción abierta debe tener al menos un intervalo de horario');
    }

    // Validación: tipo de excepción válido
    const validTypes = ['closed', 'custom', 'range'];
    if (!validTypes.includes(exception.exceptionType)) {
      throw new Error(`Tipo de excepción inválido. Debe ser uno de: ${validTypes.join(', ')}`);
    }

    // Validación: excepciones de tipo 'range' deben tener startDate y endDate
    if (exception.exceptionType === 'range') {
      if (!exception.startDate || !exception.endDate) {
        throw new Error('Las excepciones de tipo "range" requieren startDate y endDate');
      }
    }

    return this.businessInfoRepository.addException(exception);
  }
}
