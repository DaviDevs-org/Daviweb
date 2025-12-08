import { Interval, IntervalDTO } from "./interval.entity";

export interface ExceptionItemDTO {
  id?: string;
  date: string;
  closed: boolean;
  intervals: IntervalDTO[];
  exceptionType: 'closed' | 'custom' | 'range';
  startDate?: string;
  endDate?: string;
}

export class ExceptionItem {
  constructor(
    public date: string,
    public closed: boolean,
    public intervals: Interval[],
    public exceptionType: 'closed' | 'custom' | 'range',
    public id?: string,
    public isEditing?: boolean,
    public startDate?: string, // para tipo 'range'
    public endDate?: string   // para tipo 'range'
  ) {
    this.validateDates();
    this.validateIntervals();
  }

  private validateIntervals(): void {
    if (this.closed || !this.intervals || this.intervals.length <= 1) return;

    // Ordenar intervalos por hora de apertura
    const sortedIntervals = [...this.intervals].sort((a, b) => a.open.localeCompare(b.open));

    for (let i = 0; i < sortedIntervals.length - 1; i++) {
      const current = sortedIntervals[i];
      const next = sortedIntervals[i + 1];

      if (next.open < current.close) {
        throw new Error(`Solapamiento de horarios en excepción ${this.date}: ${current.open}-${current.close} se solapa con ${next.open}-${next.close}`);
      }
    }
  }

  private validateDates(): void {
    if (this.exceptionType === 'range') {
      if (!this.startDate || !this.endDate) {
        throw new Error('Las excepciones de tipo "range" requieren startDate y endDate');
      }

      const start = new Date(this.startDate);
      const end = new Date(this.endDate);

      if (start > end) {
        throw new Error('La fecha de inicio no puede ser posterior a la fecha de fin');
      }
    }
  }

  isActiveOnDate(date: string): boolean {
    if (this.exceptionType === 'range') {
      if (!this.startDate || !this.endDate) return false;
      return date >= this.startDate && date <= this.endDate;
    }

    return this.date === date;
  }

  isTimeWithinException(time: string): boolean {
    if (this.closed) return false;

    return this.intervals.some(interval => interval.contains(time));
  }

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

  getTotalAvailableMinutes(): number {
    if (this.closed) return 0;

    return this.intervals.reduce((total, interval) => {
      return total + interval.getDurationInMinutes();
    }, 0);
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

  toDTO(): ExceptionItemDTO {
    const tdo: ExceptionItemDTO = {
      id: this.id,
      date: this.date,
      closed: this.closed,
      intervals: this.intervals.map(interval => interval.toDTO()),
      exceptionType: this.exceptionType
    };

    if (this.startDate) {
      tdo.startDate = this.startDate;
    }

    if (this.endDate) {
      tdo.endDate = this.endDate;
    }

    return tdo;
  }
  static fromDTO(dto: ExceptionItemDTO & { id?: string }): ExceptionItem {
    const intervals = (dto.intervals || []).map(intervalDTO => Interval.fromDTO(intervalDTO));
    return new ExceptionItem(
      dto.date,
      dto.closed,
      intervals,
      dto.exceptionType,
      dto.id,
      false,
      dto.startDate,
      dto.endDate
    );
  }
}
