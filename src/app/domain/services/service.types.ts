import { TimeSegment, HairLengthModifier, HairLengthModifiers, HourRange } from './service.entity';

export interface ServiceDTO {
  name: string;
  description: string;
  timeSegments: TimeSegment[];
  imageUrl?: string;
  requiresHairLength?: boolean;
  hairLengthModifiers?: HairLengthModifiers;
  hourRange?: HourRange;
}

export interface NewService {
  name: string;
  description: string;
  timeSegments: TimeSegment[];
  requiresHairLength?: boolean;
  hairLengthModifiers?: HairLengthModifiers;
  hourRange?: HourRange;
}

export interface AppointementService {
  name: string;
  timeSegments: TimeSegment[];
  hairLengthModifiers?: HairLengthModifiers;
}