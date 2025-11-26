import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ScheduleRepository } from '@application/business/schedule/schedule.repository.interface';
import { ExceptionItem } from '@domain/index';

@Injectable({
  providedIn: 'root'
})
export class GetExceptionsUseCase {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  execute(): Observable<ExceptionItem[]> {
    return this.scheduleRepository.getExceptions();
  }
}
