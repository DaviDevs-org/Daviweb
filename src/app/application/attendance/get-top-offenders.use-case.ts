import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AttendanceRepository } from './attendance.repository.interface';
import { AttendanceRecord } from '@domain/attendance/attendance-record.entity';

@Injectable({
  providedIn: 'root'
})
export class GetTopOffendersUseCase {
  private repo = inject(AttendanceRepository);

  execute(limit: number = 20): Observable<AttendanceRecord[]> {
    return this.repo.getTopOffenders(limit);
  }
}
