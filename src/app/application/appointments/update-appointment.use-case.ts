import { Injectable } from '@angular/core';
import { Appointment } from '@domain/index';
import { AppointmentRepository } from './appointment.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class UpdateAppointmentUseCase {
  constructor(private appointmentRepository: AppointmentRepository) {}

  execute(id: string, appointment: Appointment): Promise<void> {
    return this.appointmentRepository.updateAppointment(id, appointment);
  }
}
