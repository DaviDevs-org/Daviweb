import { Injectable } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { ScheduleRepository } from '@application/business';
import { ReservedSlot, PastDateHandler, ExceptionHandler, WeeklyScheduleHandler, AvailabilityContext } from '@domain/index';

@Injectable({
  providedIn: 'root'
})
export class GetAvailableSlotsForDayUseCase {
    constructor(private scheduleRepository: ScheduleRepository) { }

    execute(date: Date): Observable<string[]> {
        return combineLatest([
            this.scheduleRepository.getSchedule(),
            this.scheduleRepository.getExceptions(),
            this.scheduleRepository.getSlots()
        ]).pipe(
            map(([schedule, exceptions, reservedSlots]) => {
                const context: AvailabilityContext = { date, schedule, exceptions };

                const pastDateHandler = new PastDateHandler();
                const exceptionHandler = new ExceptionHandler();
                const weeklyScheduleHandler = new WeeklyScheduleHandler();

                pastDateHandler.setNext(exceptionHandler).setNext(weeklyScheduleHandler);

                const availability = pastDateHandler.handle(context);

                if (!availability.isAvailable) {
                    return [];
                }

                return this.calculateSlots(availability.intervals, reservedSlots, date);
            })
        );
    }

    private calculateSlots(intervals: any[], reservedSlots: ReservedSlot[], date: Date): string[] {
        const dateKey = this.formatDate(date);
        // Filter reserved slots for this date
        const dayReservedSlots = reservedSlots
            .filter(slot => slot.date === dateKey)
            .map(s => this.normalizeTime(s.time));

        let availableSlots: string[] = [];
        intervals.forEach(interval => {
            availableSlots.push(...this.hoursRangeFromOpenClose(interval.open, interval.close));
        });

        // Filter out booked slots
        return availableSlots.filter(slot => !dayReservedSlots.includes(slot));
    }

    private hoursRangeFromOpenClose(open: string, close: string, step = 30): string[] {
        if (!open || !close) return [];
        const result: string[] = [];
        const [openH, openM] = open.split(':').map(Number);
        const [closeH, closeM] = close.split(':').map(Number);

        let hour = openH;
        let minute = openM;
        while (hour < closeH || (hour === closeH && minute < closeM)) {
            result.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
            minute += step;
            if (minute >= 60) { minute = 0; hour++; }
        }

        return result;
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private normalizeTime(t: string | undefined | null): string {
        if (!t) return '00:00';
        const [h, m] = t.split(':').map(v => Number(v));
        const hh = isNaN(h) ? 0 : h;
        const mm = isNaN(m) ? 0 : m;
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
}
