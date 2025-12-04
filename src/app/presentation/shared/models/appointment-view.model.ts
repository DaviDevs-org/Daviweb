import { Appointment } from '@domain/appointments';
import { Service } from '@domain/services/service.entity';

export interface AppointmentView {
  id?: string;
  name?: string;
  phone?: string;
  description?: string;
  barber?: string;
  hairLengthChoice?: string;
  datetime: Date;
  dateISO: string;
  timeNormalized: string;
  service?: Service;
}

export function toAppointmentView(appointment: Appointment): AppointmentView {
  const datetime: Date = appointment.datetime;

  const dateISO = `${datetime.getFullYear()}-${String(datetime.getMonth() + 1).padStart(2, '0')}-${String(datetime.getDate()).padStart(2, '0')}`;

  const timeNormalized = `${String(datetime.getHours()).padStart(2, '0')}:${String(datetime.getMinutes()).padStart(2, '0')}`;

  return {
    id: appointment.id,
    name: appointment.name,
    phone: appointment.phone,
    description: appointment.description,
    barber: appointment.barber,
    hairLengthChoice: appointment.hairLengthChoice,
    datetime,
    dateISO,
    timeNormalized,
    service: appointment.service as Service
  };
}
