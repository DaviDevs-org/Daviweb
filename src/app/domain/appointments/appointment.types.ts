import { AppointmentService } from '@domain/services/service.types';

export interface AppointmentDTO {
  datetime: Date;
  createdAt: Date;
  service: AppointmentService;
  description?: string | null;
  name?: string | null;
  phone?: string | null;
  barber?: string | null;
  hairLengthChoice?: 'short' | 'medium' | 'long' | null;
}
