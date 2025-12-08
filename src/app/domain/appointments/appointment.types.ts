import { AppointmentService } from "@domain/services/service.types";


export interface AppointmentDTO {
    datetime: Date;
    createdAt: Date;
    service: AppointmentService;
    name?: string;
    phone?: string;
    description?: string;
    barber?: string;
    hairLengthChoice?: 'short' | 'medium' | 'long';
}
