import { AppointmentService } from "@domain/services/service.types";


export interface AppointmentDTO {
    datetime: Date;
    createdAt: Date;
    service: AppointmentService;
    description?: string;
    name?: string;
    phone?: string;
    barber?: string;
    hairLengthChoice?: 'short' | 'medium' | 'long';
}
