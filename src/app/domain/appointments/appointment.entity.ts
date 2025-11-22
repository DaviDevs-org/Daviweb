import { AppointmentService } from "@domain/services/service.types";
import { AppointmentDTO } from "./appointment.types";

export class Appointment {
  date: string = "";
  time: string = "";

  constructor(
    public datetime: Date,
    public service: AppointmentService,
    public id?: string,
    public description?: string,
    public name?: string,
    public phone?: string,
    public barber?: string,
    public hairLengthChoice?: 'short' | 'medium' | 'long'
  ) {
    this.date = datetime.toISOString().split('T')[0];
    this.time = `${String(datetime.getHours()).padStart(2, '0')}:${String(datetime.getMinutes()).padStart(2, '0')}`;
  }

  toDTO(): AppointmentDTO {
    const base: AppointmentDTO = {
      datetime: this.datetime,
      createdAt: new Date(),
      service: this.service,
      description: this.description,
      name: this.name,
      phone: this.phone,
      barber: this.barber,
      hairLengthChoice: this.hairLengthChoice
    };
    return base;
  }

  static fromDTO(tdo: AppointmentDTO, id?: string): Appointment {
    return new Appointment(
      tdo.datetime,
      tdo.service,
      id,
      tdo.description,
      tdo.name,
      tdo.phone,
      tdo.barber,
      tdo.hairLengthChoice
    );
  }
}
