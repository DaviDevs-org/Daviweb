import { Observable } from 'rxjs';
import { ScheduleDay, ExceptionItem} from '@domain/index';
import { ReservedSlot } from '@domain/business-info/availability/reservedSlots.entity';

export abstract class ScheduleRepository {
    // Schedule operations
    abstract getSchedule(): Observable<ScheduleDay[]>;
    abstract updateSchedule(schedule: ScheduleDay[]): Promise<void>;

    // Exceptions (holidays, special closures)
    abstract getExceptions(): Observable<ExceptionItem[]>;
    abstract addException(exception: ExceptionItem): Promise<void>;
    abstract updateException(id: string, exception: ExceptionItem): Promise<void>;
    abstract deleteException(id: string): Promise<void>;

    //Slot operations
    abstract getSlots(): Observable<ReservedSlot[]>;
    abstract addSlot(slot: ReservedSlot): Promise<void>;
    abstract deleteSlot(id: string): Promise<void>;
}
