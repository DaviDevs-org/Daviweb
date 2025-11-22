import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Appointment } from '@domain/appointments/appointment.entity';
import { AppointmentRepository } from './appointment.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class GetAppointmentsUseCase {
  constructor(private appointmentRepository: AppointmentRepository) {}

  execute(): Observable<Appointment[]> {
    return this.appointmentRepository.getAppointments();
  }
}
