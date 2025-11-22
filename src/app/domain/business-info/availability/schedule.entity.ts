import { Interval, IntervalTDO } from './interval.entity';

export interface ScheduleDayTDO {
  day: string;
  name: string;
  closed: boolean;
  intervals: IntervalTDO[];
}

export class ScheduleDay {
  constructor(
    public day: string,
    public name: string,
    public closed: boolean,
    public intervals: Interval[]
  ) {}


  isOpen(): boolean {
    return !this.closed && this.intervals.length > 0;
  }


  isTimeWithinDay(time: string): boolean {
    if (this.closed) return false;

    const [hours, minutes] = time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;

    return this.intervals.some(interval => {
      const [openHours, openMinutes] = interval.open.split(':').map(Number);
      const [closeHours, closeMinutes] = interval.close.split(':').map(Number);
      
      const openTime = openHours * 60 + openMinutes;
      const closeTime = closeHours * 60 + closeMinutes;

      return timeInMinutes >= openTime && timeInMinutes < closeTime;
    });
  }

  /**
   * Obtiene el horario total del día (desde la apertura más temprana hasta el cierre más tardío)
   */
  getTotalRange(): { open: string; close: string } | null {
    if (this.closed || this.intervals.length === 0) return null;

    const openTimes = this.intervals.map(i => this.timeToMinutes(i.open));
    const closeTimes = this.intervals.map(i => this.timeToMinutes(i.close));

    const earliestOpen = Math.min(...openTimes);
    const latestClose = Math.max(...closeTimes);

    return {
      open: this.minutesToTime(earliestOpen),
      close: this.minutesToTime(latestClose)
    };
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  toTDO(): ScheduleDayTDO {
    return {
      day: this.day,
      name: this.name,
      closed: this.closed,
      intervals: this.intervals.map(interval => interval.toTDO())
    };
  }

  static fromTDO(tdo: ScheduleDayTDO): ScheduleDay {
    const intervals = tdo.intervals.map(i => new Interval(i.open, i.close));
    return new ScheduleDay(tdo.day, tdo.name, tdo.closed, intervals);
  }
}
