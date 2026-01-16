import { Appointment } from '@domain/appointments/appointment.entity';

export interface BookingResult {
  appointmentId: string;
}

export interface BookingStrategy {
  execute(appointment: Appointment): Promise<BookingResult>;
}
