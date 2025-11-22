import {Appointment} from '@domain/appointments';
import {AppointmentRepository} from '@application/appointments/appointment.repository.interface';
import {Injectable} from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CreateAppointmentUseCase {
  constructor(private appointmentRepository: AppointmentRepository) {}

  async execute(appointment: Appointment): Promise<void> {
    // Could add validation here
    // Could check for conflicts with existing appointments
    // Could send confirmation email

    return this.appointmentRepository.addAppointment(appointment);
  }
}
