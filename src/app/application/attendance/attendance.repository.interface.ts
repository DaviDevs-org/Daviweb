import { Observable } from 'rxjs';
import { AttendanceRecord } from '@domain/attendance/attendance-record.entity';

export abstract class AttendanceRepository {
    abstract addStrike(phone: string, reason: string): Promise<void>;
    abstract getTopOffenders(limitCount: number): Observable<AttendanceRecord[]>;
}
