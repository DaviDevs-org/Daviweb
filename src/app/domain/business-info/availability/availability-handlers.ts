import { ScheduleDay } from './schedule.entity';
import { ExceptionItem } from './exception.entity';
import { Interval } from './interval.entity';

export interface AvailabilityContext {
    date: Date;
    schedule: ScheduleDay[];
    exceptions: ExceptionItem[];
}

export interface DayAvailability {
    isAvailable: boolean;
    intervals: Interval[];
    reason?: string;
}

export abstract class AvailabilityHandler {
    protected next: AvailabilityHandler | null = null;

    setNext(handler: AvailabilityHandler): AvailabilityHandler {
        this.next = handler;
        return handler;
    }

    abstract handle(context: AvailabilityContext): DayAvailability;
}

export class PastDateHandler extends AvailabilityHandler {
    handle(context: AvailabilityContext): DayAvailability {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const checkDate = new Date(context.date);
        checkDate.setHours(0, 0, 0, 0);

        if (checkDate < today) {
            return { isAvailable: false, intervals: [], reason: 'Past date' };
        }
        return this.next ? this.next.handle(context) : { isAvailable: false, intervals: [], reason: 'End of chain' };
    }
}

export class ExceptionHandler extends AvailabilityHandler {
    handle(context: AvailabilityContext): DayAvailability {
        const dateKey = this.formatDate(context.date);
        // Check if there is an exception for this date
        const exception = context.exceptions.find(ex => {
            // Use isActiveOnDate if available, otherwise fallback to date check
            return (ex as any).isActiveOnDate ? (ex as any).isActiveOnDate(dateKey) : ex.date === dateKey;
        });

        if (exception) {
            if (exception.closed) {
                return { isAvailable: false, intervals: [], reason: 'Exception: Closed' };
            }
            return { isAvailable: true, intervals: exception.intervals };
        }

        return this.next ? this.next.handle(context) : { isAvailable: false, intervals: [], reason: 'End of chain' };
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

export class WeeklyScheduleHandler extends AvailabilityHandler {
    handle(context: AvailabilityContext): DayAvailability {
        const dayName = this.getDayName(context.date);
        const daySchedule = context.schedule.find(day => day.day === dayName);

        if (!daySchedule) {
            return { isAvailable: false, intervals: [], reason: 'No schedule found' };
        }

        if (daySchedule.closed) {
            return { isAvailable: false, intervals: [], reason: 'Weekly schedule: Closed' };
        }

        return { isAvailable: true, intervals: daySchedule.intervals };
    }

    private getDayName(date: Date): string {
        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        return dias[date.getDay()];
    }
}
