import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BusinessInfoRepository } from './business-info.repository.interface';
import { ScheduleDay } from '@domain/business-info';

@Injectable({
  providedIn: 'root'
})
export class GetScheduleUseCase {
  constructor(private readonly businessInfoRepository: BusinessInfoRepository) {}

  execute(): Observable<ScheduleDay[]> {
    return this.businessInfoRepository.getSchedule();
  }
}
