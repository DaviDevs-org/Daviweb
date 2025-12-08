import { Interval, IntervalDTO } from './interval.entity';

export interface ScheduleDayDTO {
  day: string;
  name: string;
  closed: boolean;
  intervals: IntervalDTO[];
}

export class ScheduleDay {
  constructor(
    public day: string,
    public name: string,
    public closed: boolean,
    public intervals: Interval[]
  ) {
    this.validateIntervals();
  }

  private validateIntervals(): void {
    if (this.closed || this.intervals.length <= 1) return;

    // Ordenar intervalos por hora de apertura
    const sortedIntervals = [...this.intervals].sort((a, b) => a.open.localeCompare(b.open));

    for (let i = 0; i < sortedIntervals.length - 1; i++) {
      const current = sortedIntervals[i];
      const next = sortedIntervals[i + 1];

      if (next.open < current.close) {
        throw new Error(`Solapamiento detectado en ${this.day}: ${current.open}-${current.close} se solapa con ${next.open}-${next.close}`);
      }
    }
  }


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

  toDTO(): ScheduleDayDTO {
    return {
      day: this.day,
      name: this.name,
      closed: this.closed,
      intervals: this.intervals.map(interval => interval.toDTO())
    };
  }

  static fromDTO(dto: ScheduleDayDTO): ScheduleDay {
    const intervals = dto.intervals.map(i => new Interval(i.open, i.close));
    return new ScheduleDay(dto.day, dto.name, dto.closed, intervals);
  }
}
