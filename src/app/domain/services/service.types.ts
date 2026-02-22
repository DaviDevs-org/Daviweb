import {
  TimeSegment,
  HairLengthModifier,
  HairLengthModifiers,
  HourRange,
} from './service.entity';

export interface ServiceDTO {
  id?: string;
  name: string;
  description: string;
  timeSegments: TimeSegment[];
  imageUrl?: string;
  requiresHairLength?: boolean;
  hairLengthModifiers?: HairLengthModifiers;
  hourRange?: HourRange;
  basePrice?: number;
}

export interface NewService {
  name: string;
  description: string;
  timeSegments: TimeSegment[];
  requiresHairLength?: boolean;
  hairLengthModifiers?: HairLengthModifiers;
  hourRange?: HourRange;
  basePrice?: number;
}

export interface AppointmentService {
  name: string;
  timeSegments: TimeSegment[];
  requiresHairLength?: boolean;
  hairLengthModifiers?: HairLengthModifiers;
  priceAtBooking?: number;
}
