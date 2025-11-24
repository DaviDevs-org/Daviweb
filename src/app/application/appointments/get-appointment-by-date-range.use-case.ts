import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Appointment } from '@domain/index';
import { AppointmentRepository } from './appointment.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class GetAppointmentsByDateUseCase {
  constructor(private appointmentRepository: AppointmentRepository) {}

  execute(date: Date): Observable<Appointment[]> {
    return this.appointmentRepository.getAppointmentsByDate(date);
  }
}
