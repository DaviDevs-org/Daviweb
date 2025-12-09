import { AppointmentService } from '@domain/services/service.types';
import { AppointmentDTO } from './appointment.types';
import { Service } from '@domain/services/service.entity';

export class Appointment {
  dateISO: string = '';
  timeNormalized: string = '';

  constructor(
    public datetime: Date,
    public service: AppointmentService,
    public id?: string,
    public description?: string | null,
    public name?: string | null,
    public phone?: string | null,
    public barber?: string | null,
    public hairLengthChoice?: 'short' | 'medium' | 'long' | null
  ) {
    this.dateISO = datetime.toISOString().split('T')[0];
    this.timeNormalized = `${String(datetime.getHours()).padStart(
      2,
      '0'
    )}:${String(datetime.getMinutes()).padStart(2, '0')}`;
  }

  toDTO(): AppointmentDTO {
    const base: AppointmentDTO = {
      datetime: this.datetime,
      createdAt: new Date(),
      service:
        this.service instanceof Service
          ? this.service.toAppointmentService()
          : this.service, // si ya es AppointmentService
      description: this.description ?? null,
      name: this.name ?? null,
      phone: this.phone ?? null,
      barber: this.barber ?? null,
      hairLengthChoice: this.hairLengthChoice ?? null,
    };
    return base;
  }

  static fromDTO(dto: AppointmentDTO, id?: string): Appointment {
    return new Appointment(
      dto.datetime,
      dto.service,
      id,
      dto.description,
      dto.name,
      dto.phone,
      dto.barber,
      dto.hairLengthChoice
    );
  }
}
