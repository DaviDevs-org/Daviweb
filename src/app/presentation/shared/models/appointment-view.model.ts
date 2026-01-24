import { Appointment } from '@domain/appointments';
import { Service } from '@domain/services/service.entity';

export interface AppointmentView {
  id?: string;
  name?: string | null;
  phone?: string | null;
  description?: string | null;
  barber?: string | null;
  barberId?: string | null;
  hairLengthChoice?: string | null;
  datetime: Date;
  dateISO: string;
  timeNormalized: string;
  serviceName?: string | null;
  service?: Service;
}

export function toAppointmentView(
  appointment: Appointment,
  allServices: ReadonlyArray<Service> | Map<string, Service>
): AppointmentView {
  const datetime = appointment.datetime;

  const dateISO = `${datetime.getFullYear()}-${String(
    datetime.getMonth() + 1
  ).padStart(2, '0')}-${String(datetime.getDate()).padStart(2, '0')}`;
  const timeNormalized = `${String(datetime.getHours()).padStart(
    2,
    '0'
  )}:${String(datetime.getMinutes()).padStart(2, '0')}`;

  const serviceName = appointment.service?.name ?? null;
  const service =
    allServices instanceof Map
      ? (serviceName ? allServices.get(serviceName) : undefined)
      : allServices.find((s) => s.name === serviceName);

  return {
    id: appointment.id,
    name: appointment.name,
    phone: appointment.phone,
    description: appointment.description,
    barber: appointment.barber,
    barberId: appointment.barberId,
    hairLengthChoice: appointment.hairLengthChoice,
    datetime,
    dateISO,
    timeNormalized,
    serviceName,
    service, // tipo Service | undefined
  };
}
