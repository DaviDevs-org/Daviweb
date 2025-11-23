import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Appointment } from '@domain/index';
import { AppointmentRepository } from './appointment.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class GetAppointmentByIdUseCase {
  constructor(private appointmentRepository: AppointmentRepository) {}

  execute(id: string): Observable<Appointment | null> {
    return this.appointmentRepository.getAppointmentById(id);
  }
}
