import { Injectable } from '@angular/core';
import { ScheduleRepository } from '@application/business';
import { GetAvailableSlotsForDayService } from '@domain/business-info/availability/get-available-slots-for-day.service';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class GetAvailableSlotsForDayUseCase {
  private readonly slotsService = new GetAvailableSlotsForDayService();

  constructor(private scheduleRepository: ScheduleRepository) {}

  execute(date: Date): Observable<string[]> {
    return combineLatest([
      this.scheduleRepository.getSchedule(),
      this.scheduleRepository.getExceptions(),
      this.scheduleRepository.getSlots(),
    ]).pipe(
      map(([schedule, exceptions, reservedSlots]) =>
        this.slotsService.execute(date, schedule, exceptions, reservedSlots)
      )
    );
  }
}
