export interface IntervalDTO {
  open: string;
  close: string;
}

export class Interval {
  constructor(
    public open: string,
    public close: string,
  ) {
    this.validateTimeFormat(open);
    this.validateTimeFormat(close);
  }

  /**
   * Valida que el formato de tiempo sea correcto (HH:mm)
   */
  private validateTimeFormat(time: string): void {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      throw new Error(`Formato de tiempo inválido: ${time}. Use formato HH:mm`);
    }
  }

  /**
   * Calcula la duración del intervalo en minutos
   */
  getDurationInMinutes(): number {
    const [openHours, openMinutes] = this.open.split(':').map(Number);
    const [closeHours, closeMinutes] = this.close.split(':').map(Number);

    const openTime = openHours * 60 + openMinutes;
    const closeTime = closeHours * 60 + closeMinutes;

    return closeTime - openTime;
  }

  /**
   * Verifica si el intervalo es válido (la hora de cierre es posterior a la de apertura)
   */
  isValid(): boolean {
    return this.getDurationInMinutes() > 0;
  }

  contains(time: string): boolean {

    const [hours, minutes] = time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;

    const [openHours, openMinutes] = this.open.split(':').map(Number);
    const [closeHours, closeMinutes] = this.close.split(':').map(Number);

    const openTime = openHours * 60 + openMinutes;
    const closeTime = closeHours * 60 + closeMinutes;

    return timeInMinutes >= openTime && timeInMinutes < closeTime;
  }

  /**
   * Verifica si este intervalo se solapa con otro
   */
  overlaps(other: Interval): boolean {
    const thisStart = this.timeToMinutes(this.open);
    const thisEnd = this.timeToMinutes(this.close);
    const otherStart = this.timeToMinutes(other.open);
    const otherEnd = this.timeToMinutes(other.close);

    return thisStart < otherEnd && otherStart < thisEnd;
  }

  /**
   * Verifica si este intervalo es adyacente a otro (uno termina donde empieza el otro)
   */
  isAdjacentTo(other: Interval): boolean {
    return this.close === other.open || this.open === other.close;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Formatea el intervalo como texto legible
   */
  toString(): string {
    return `${this.open} - ${this.close}`;
  }

  toDTO(): IntervalDTO {
    const dto: IntervalDTO = {
      open: this.open,
      close: this.close
    };

    return dto;
  }

  static fromDTO(dto: IntervalDTO): Interval {
    return new Interval(dto.open, dto.close);
  }
}
