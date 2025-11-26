import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ScheduleRepository } from '@application/business/schedule/schedule.repository.interface';
import { ScheduleDay } from '@domain/business-info';

@Injectable({
  providedIn: 'root'
})
export class GetScheduleUseCase {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  execute(): Observable<ScheduleDay[]> {
    return this.scheduleRepository.getSchedule();
  }
}
