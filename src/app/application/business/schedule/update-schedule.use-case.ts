import { Injectable } from '@angular/core';
import { ScheduleRepository } from '@application/business/schedule/schedule.repository.interface';
import { ScheduleDay } from '@domain/business-info';

@Injectable({
  providedIn: 'root'
})
export class UpdateScheduleUseCase {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  async execute(schedule: ScheduleDay[]): Promise<void> {
    for (const day of schedule) {
      if (day.intervals.length === 0 && !day.closed) {
        throw new Error(`El día ${day.name} debe tener al menos un intervalo.`);
      }
    }

    return this.scheduleRepository.updateSchedule(schedule);
  }
}
