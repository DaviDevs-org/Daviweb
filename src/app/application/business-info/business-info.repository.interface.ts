import { Observable } from 'rxjs';
import {ScheduleDay, ExceptionItem, ContactInfo, BarberSettings, Barber} from '@domain/index';

export abstract class BusinessInfoRepository {
  // Schedule operations
  abstract getSchedule(): Observable<ScheduleDay[]>;
  abstract updateSchedule(schedule: ScheduleDay[]): Promise<void>;

  // Exceptions (holidays, special closures)
  abstract getExceptions(): Observable<ExceptionItem[]>;
  abstract addException(exception: ExceptionItem): Promise<void>;
  abstract updateException(id: string, exception: ExceptionItem): Promise<void>;
  abstract deleteException(id: string): Promise<void>;

  // Contact information
  abstract getContactInfo(): Observable<ContactInfo>;
  abstract updateContactInfo(contactInfo: ContactInfo): Promise<void>;

  // Barber settings
  abstract getBarberSettings(): Observable<BarberSettings>;
  abstract updateBarberSettings(barberSettings: BarberSettings): Promise<void>;
  abstract updateBarberSelection(state: boolean): Promise<void>;
  abstract addBarber(barber: Barber): Promise<void>;
  abstract removeBarber(barber: Barber): Promise<void>;
  abstract editBarber(oldBarber: Barber, newBarber: Barber): Promise<void>;

  // Computed data (business logic)
  abstract getAvailableSlots(date: Date, serviceDuration: number): Observable<string[]>;
}
