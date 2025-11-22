import { AppointementService } from "@domain/services/service.types";


export interface AppointmentTDO {
    datetime: Date;
    createdAt: Date;    
    service: AppointementService;
    description?: string;
    name?: string;
    phone?: string;
    barber?: string;
    hairLengthChoice?: 'short' | 'medium' | 'long';
}