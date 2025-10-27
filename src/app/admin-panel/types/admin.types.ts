export class GalleryPhoto {
  name: string = "";
  url: string = "";
  lastModified: string = "";
  id?: string;
  public imageLoaded?: boolean = false;

  constructor(name: string, url: string, lastModified: string, id: string){
    this.name = name;
    this.url = url;
    this.lastModified = lastModified;
    this.id = id;
  }
}

export interface Appointment {
  id?: string;
  createdAt?: any; // Firestore Timestamp | string
  date?: string;   // "YYYY-MM-DD"
  datetime?: any;  // Firestore Timestamp
  description?: string;
  email?: string;
  name?: string;
  phone?: string;
  time?: string;   // "13:00"
  dateISO?: string;
  timeNormalized?: string;
  duration?: string;
  service?: Service;
  barber?: string;
  hairLengthChoice?: 'short' | 'medium' | 'long';
}

export interface ServiceDTO {
  name: string;
  description: string;
  timeSegments: TimeSegment[];
  imageUrl?: string;
  requiresHairLength?: boolean;
  hairLengthModifiers?: HairLengthModifiers;
}

export interface AppointmentFirestore {
  name: string;
  email?: string;
  phone?: string;
  description?: string;
  date: string;
  time: string;
  service?: ServiceDTO;
  barber?: string;
  datetime?: { seconds: number; nanoseconds: number };
  hairLengthChoice?: 'short' | 'medium' | 'long';
}

export interface TimeSegment {
  duration: number; // Duración en minutos del segmento activo
  breakAfter?: number; // Tiempo de descanso/pausa después de este segmento (opcional)
}

// Solo guardamos extraTime ahora
export interface HairLengthModifiers {
  short: { time: number };
  medium: { time: number };
  long: { time: number };
}

export class Service {
  constructor(
    public name: string,
    public description: string,
    public timeSegments: TimeSegment[],   // Solo se usa si !requiresHairLength
    public requiresHairLength: boolean = false,
    public hairLengthModifiers: HairLengthModifiers = {
      short: { time: 30 },
      medium: { time: 45 },
      long: { time: 60 }
    },
    public imageUrl?: string,
    public id?: string
  ) {}

  // Devuelve la duración real según hairLength
  getDuration(hairLength?: 'short' | 'medium' | 'long'): number {
    if (this.requiresHairLength && hairLength && this.hairLengthModifiers) {
      return this.hairLengthModifiers[hairLength]?.time || 30;
    }
    // Si no requiere hairLength, suma timeSegments
    if (this.timeSegments && this.timeSegments.length) {
      return this.timeSegments.reduce((total, seg) => total + seg.duration + (seg.breakAfter || 0), 0);
    }
    return 30; // fallback
  }

  // Solo suma slots activos
  getActiveTime(): number {
    return this.timeSegments.reduce((t, s) => t + s.duration, 0);
  }

  toJson(): ServiceDTO {
    return {
      name: this.name,
      description: this.description,
      timeSegments: this.timeSegments,
      imageUrl: this.imageUrl,
      requiresHairLength: this.requiresHairLength,
      hairLengthModifiers: this.hairLengthModifiers
    };
  }
}


export interface NewService {
  name: string;
  description: string;
  timeSegments: TimeSegment[];
  requiresHairLength?: boolean;
  hairLengthModifiers?: HairLengthModifiers;
}

export type Interval = { open: string; close: string; blocked?: boolean };

export interface ScheduleDay {
  day: string;
  name: string;
  closed: boolean;
  intervals: Interval[];
}

export interface ContactInfo {
  phone: string;
  address: string;
}

export interface Statistics {
  monthlyClients: number;
  monthlyRevenue: number;
  averageRating: number;
  weeklyAppointments: number;
}

export interface ExceptionItem {
  date: string;
  closed: boolean;
  intervals: Interval[];
  exceptionType: 'closed' | 'custom' | 'range';
  isEditing?: boolean;
  startDate?: string; // para tipo 'range'
  endDate?: string;   // para tipo 'range'
}

export type AdminTab = 'gallery' | 'services' | 'info' | 'stats';

export interface NavTab { id: AdminTab; icon: string; label: string; }

export interface StatCard {
  icon: string;
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
}

export interface BarberSettings {
  settings: {
    barberSelection: boolean;
    staff: Barber[];
  }
}

export interface Barber { id: string; name: string; visible?: boolean; imageUrl?: string; }
