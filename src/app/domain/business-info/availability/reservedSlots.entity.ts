export interface ReservedSlotDTO {
  appointmentId: string;
  dateTime: Date;
  createdAt: Date;
  barberId?: string | null;
}

export class ReservedSlot {
  date: string = '';
  time: string = '';
  constructor(
    public appointmentId: string,
    public dateTime: Date,
    public id?: string,
    public barberId: string | null = null
  ) {
    // Defensive check: ensure dateTime is a valid Date object
    if (!(this.dateTime instanceof Date)) {
      this.dateTime = new Date(this.dateTime);
    }
    if (isNaN(this.dateTime.getTime())) {
      console.error('ReservedSlot: Invalid dateTime, defaulting to now', dateTime);
      this.dateTime = new Date();
    }

    this.date = this.dateTime.toISOString().split('T')[0];
    this.time = `${String(this.dateTime.getHours()).padStart(2, '0')}:${String(
      this.dateTime.getMinutes()
    ).padStart(2, '0')}`;
  }

  toDTO(): ReservedSlotDTO {
    const dto: ReservedSlotDTO = {
      appointmentId: this.appointmentId,
      dateTime: this.dateTime,
      createdAt: new Date(),
      barberId: this.barberId,
    };
    return dto;
  }

  static fromDTO(dto: ReservedSlotDTO & { id?: string }): ReservedSlot {
    const raw = dto.dateTime as any;

    let dateTime: Date;

    if (!raw) {
      // Si no hay fecha, asumimos ahora (para evitar crash), pero esto debería filtrarse antes
      dateTime = new Date();
    } else if (raw && typeof raw.toDate === 'function') {
      const result = raw.toDate();
      dateTime = result instanceof Date ? result : new Date(result);
    } else if (raw instanceof Date) {
      dateTime = raw;
    } else {
      dateTime = new Date(raw);
    }
    
    // Safety check final
    if (isNaN(dateTime.getTime())) {
      dateTime = new Date();
    }

    return new ReservedSlot(dto.appointmentId, dateTime, dto.id, dto.barberId);
  }
}
