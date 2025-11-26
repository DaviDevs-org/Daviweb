export interface ReservedSlotDTO {
  appointmentId: string;
  dateTime: Date;
  createdAt: Date;
}

export class ReservedSlot {
  date: string = "";
  time: string = "";
  constructor(
    public appointmentId: string,
    public dateTime: Date,
    public id?: string
  ) {
    this.date = dateTime.toISOString().split('T')[0];
    this.time = `${String(dateTime.getHours()).padStart(2, '0')}:${String(dateTime.getMinutes()).padStart(2, '0')}`;
  }

  toDTO(): ReservedSlotDTO {
    const dto: ReservedSlotDTO = {
      appointmentId: this.appointmentId,
      dateTime: this.dateTime,
      createdAt: new Date()
    };
    return dto;
  }

  static fromDTO(dto: ReservedSlotDTO & { id?: string }): ReservedSlot {
    return new ReservedSlot(dto.appointmentId, dto.dateTime, dto.id);
  }
}
