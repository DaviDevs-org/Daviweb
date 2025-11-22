import { Observable } from 'rxjs';
import { ScheduleDay } from '@domain/business-info/availability/schedule.entity';
import { ExceptionItem } from '@domain/business-info/availability/exception.entity';

export abstract class BusinessInfoRepository {
  // Schedule operations
  abstract getSchedule(): Observable<ScheduleDay[]>;
  abstract getScheduleByDay(day: number): Observable<ScheduleDay | null>;
  abstract updateSchedule(schedule: ScheduleDay[]): Promise<void>;
  abstract updateScheduleDay(day: number, scheduleDay: ScheduleDay): Promise<void>;

  // Exceptions (holidays, special closures)
  abstract getExceptions(): Observable<ExceptionItem[]>;
  abstract getExceptionsByDateRange(startDate: Date, endDate: Date): Observable<ExceptionItem[]>;
  abstract addException(exception: ExceptionItem): Promise<void>;
  abstract deleteException(id: string): Promise<void>;

  // Computed data (business logic)
  abstract getAvailableSlots(date: Date, serviceDuration: number): Observable<string[]>;
}
