import {Appointment} from '@domain/index';
import {AppointmentRepository} from '@application/appointments/appointment.repository.interface';
import {Injectable} from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AddAppointmentUseCase {
  constructor(private appointmentRepository: AppointmentRepository) {}

  async execute(appointment: Appointment): Promise<void> {
    // Could add validation here
    // Could check for conflicts with existing appointments
    // Could send confirmation email

    return this.appointmentRepository.addAppointment(appointment);
  }
}
