import { Injectable } from '@angular/core';
import { AppointmentRepository } from './appointment.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class DeleteAppointmentUseCase {
  constructor(private appointmentRepository: AppointmentRepository) {}

  execute(id: string): Promise<void> {
    return this.appointmentRepository.deleteAppointment(id);
  }
}
