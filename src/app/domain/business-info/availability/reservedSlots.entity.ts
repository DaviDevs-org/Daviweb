export interface ReservedSlotDTO {
  appointmentId: string;
  dateTime: Date;
  createdAt: Date;
}

export class ReservedSlot {
  date: string = '';
  time: string = '';
  constructor(
    public appointmentId: string,
    public dateTime: Date,
    public id?: string
  ) {
    this.date = dateTime.toISOString().split('T')[0];
    this.time = `${String(dateTime.getHours()).padStart(2, '0')}:${String(
      dateTime.getMinutes()
    ).padStart(2, '0')}`;
  }

  toDTO(): ReservedSlotDTO {
    const dto: ReservedSlotDTO = {
      appointmentId: this.appointmentId,
      dateTime: this.dateTime,
      createdAt: new Date(),
    };
    return dto;
  }

  static fromDTO(dto: ReservedSlotDTO & { id?: string }): ReservedSlot {
    const raw = dto.dateTime as any;

    const dateTime: Date =
      raw && typeof raw.toDate === 'function'
        ? raw.toDate() // Timestamp -> Date
        : raw instanceof Date
        ? raw
        : new Date(raw); // por si fuera string/number

    return new ReservedSlot(dto.appointmentId, dateTime, dto.id);
  }
}
