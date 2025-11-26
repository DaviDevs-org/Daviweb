import { Injectable } from '@angular/core';
import { ScheduleRepository } from '@application/business/schedule/schedule.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class DeleteExceptionUseCase {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  async execute(id: string): Promise<void> {
    return this.scheduleRepository.deleteException(id);
  }
}
