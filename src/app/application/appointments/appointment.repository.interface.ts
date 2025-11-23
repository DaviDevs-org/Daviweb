import { Observable } from 'rxjs';
import { Appointment } from '@domain/appointments';

export abstract class AppointmentRepository {
  // Read operations (Observable for reactive data)
  abstract getAppointments(): Observable<Appointment[]>;
  abstract getAppointmentById(id: string): Observable<Appointment | null>;
  abstract getAppointmentsByDate(date: Date): Observable<Appointment[]>;
  abstract getAppointmentsByDateRange(startDate: Date, endDate: Date): Observable<Appointment[]>;

  // Write operations (Promise for one-time actions)
  abstract addAppointment(appointment: Appointment): Promise<void>;
  abstract updateAppointment(id: string, appointment: Appointment): Promise<void>;
  abstract deleteAppointment(id: string): Promise<void>;
}
