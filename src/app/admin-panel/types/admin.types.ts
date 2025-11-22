
/* REFACTORED gallery-photo.entity.ts
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
*/
/* REFACTORED appointment.entity.ts
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
*/
/* REFACTORED service.types.ts
export interface ServiceDTO {
  name: string;
  description: string;
  timeSegments: TimeSegment[];
  imageUrl?: string;
  requiresHairLength?: boolean;
  hairLengthModifiers?: HairLengthModifiers;
  hourRange?: HourRange;
}

 */

/* REFACTORED appointment.types.ts
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
*/

/* REFACTORED service.entity.ts

export interface TimeSegment {
  duration: number; // Duración en minutos del segmento activo
  breakAfter?: number; // Tiempo de descanso/pausa después de este segmento (opcional)
}

export interface HairLengthModifier {
  time: number; // sigue valiendo para los casos simples
  segments?: TimeSegment[]; // añadimos esto para los casos con segmentos específicos
}

// Solo guardamos extraTime ahora
export type HairLengthModifiers = {
  short: HairLengthModifier;
  medium: HairLengthModifier;
  long: HairLengthModifier;
}

export interface HourRange {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export class Service {
  constructor(
    public name: string,
    public description: string,
    public timeSegments: TimeSegment[] = [],
    public requiresHairLength: boolean = false,
    public hairLengthModifiers: HairLengthModifiers = {
      short: { time: 30 },
      medium: { time: 45 },
      long: { time: 60 }
    },
    public imageUrl?: string,
    public id?: string,
    public hourRange?: HourRange
  ) {}

  // Devuelve los timeSegments "materializados" para una longitud concreta
  getTimeSegmentsForLength(length: 'short' | 'medium' | 'long'): TimeSegment[] {
    if (!this.requiresHairLength) {
      return this.timeSegments || [];
    }
    const mod = this.hairLengthModifiers?.[length];
    if (!mod) return [];
    if (mod.segments && mod.segments.length > 0) {
      return mod.segments;
    }
    if (mod.time && mod.time > 0) {
      return [{ duration: mod.time, breakAfter: 0 }];
    }
    return [];
  }

  // Crea una instancia equivalente a un "servicio normal" para esa longitud
  materializeForLength(length: 'short' | 'medium' | 'long'): Service {
    const segments = this.getTimeSegmentsForLength(length);
    return new Service(
      this.name,
      this.description,
      segments,
       requiresHairLength false,
      this.hairLengthModifiers,
      this.imageUrl,
      this.id,
      this.hourRange
    );
  }

  // Calcula el tiempo total (segmentos + descansos)
  computeTotalTime(hairLength?: 'short' | 'medium' | 'long'): number {
    if (this.requiresHairLength && hairLength && this.hairLengthModifiers?.[hairLength]) {
      const modifier = this.hairLengthModifiers[hairLength];
      if (modifier.segments?.length) {
        return modifier.segments.reduce((sum, seg) => sum + seg.duration + (seg.breakAfter || 0), 0);
      }
      return modifier.time;
    }

    if (this.timeSegments?.length) {
      return this.timeSegments.reduce((sum, seg) => sum + seg.duration + (seg.breakAfter || 0), 0);
    }

    return 30; // fallback
  }

  // Calcula solo tiempo activo sin pausas
  getActiveTime(hairLength?: 'short' | 'medium' | 'long'): number {
    if (this.requiresHairLength && hairLength && this.hairLengthModifiers?.[hairLength]) {
      const modifier = this.hairLengthModifiers[hairLength];
      if (modifier.segments?.length) {
        return modifier.segments.reduce((sum, seg) => sum + seg.duration, 0);
      }
      return modifier.time;
    }

    if (this.timeSegments?.length) {
      return this.timeSegments.reduce((sum, seg) => sum + seg.duration, 0);
    }

    return 30;
  }

  // Devuelve el rango estimado de tiempo de un servicio
  getEstimatedTimeRange(): string {
    // Caso con longitudes de pelo: rango entre los tiempos declarados/segmentados
    if (this.requiresHairLength && this.hairLengthModifiers) {
      const times: number[] = [];
      for (const length of ['short', 'medium', 'long'] as const) {
        const modifier = this.hairLengthModifiers[length];
        if (!modifier) continue;
        if (modifier.segments?.length) {
          const total = modifier.segments.reduce((sum, seg) => sum + seg.duration + (seg.breakAfter || 0), 0);
          if (total > 0) times.push(total);
        } else if (typeof modifier.time === 'number' && modifier.time > 0) {
          times.push(modifier.time);
        }
      }
      if (times.length) {
        const min = Math.min(...times);
        const max = Math.max(...times);
        return min === max ? `${min} min` : `${min}-${max} min`;
      }
      // Si por datos antiguos falta info, intentar usar timeSegments global como fallback
      if (this.timeSegments?.length) {
        const totalGlobal = this.timeSegments.reduce((sum, seg) => sum + seg.duration + (seg.breakAfter || 0), 0);
        return `${totalGlobal} min`;
      }
      return '30 min';
    }

    // Servicio normal (sin longitudes). Si tiene breaks, mostrar rango activo-total
    if (this.timeSegments?.length) {
      const active = this.timeSegments.reduce((sum, seg) => sum + seg.duration, 0);
      const total = this.timeSegments.reduce((sum, seg) => sum + seg.duration + (seg.breakAfter || 0), 0);
      return active === total ? `${total} min` : `${active}-${total} min`;
    }

    return '30 min'; // fallback para datos muy antiguos
  }

  // Exporta a JSON limpio para Firestore
  toJson(): ServiceDTO {
    const base: ServiceDTO = {
      name: this.name,
      description: this.description,
      timeSegments: this.timeSegments,
      imageUrl: this.imageUrl,
      requiresHairLength: this.requiresHairLength,
      hairLengthModifiers: this.hairLengthModifiers,
    };
    if (this.hourRange) {
      base.hourRange = { ...this.hourRange };
    }
    return base;
  }
}

*/


/* REFACTORED service.types.ts
export interface NewService {
  name: string;
  description: string;
  timeSegments: TimeSegment[];
  requiresHairLength?: boolean;
  hairLengthModifiers?: HairLengthModifiers;
  hourRange?: HourRange;
}
*/

export type Interval = { open: string; close: string; blocked?: boolean };

export interface ScheduleDay {
  day: string;
  name: string;
  closed: boolean;
  intervals: Interval[];
}
/* REFACTORED contact-info.types.ts
export interface ContactInfo {
  phone: string;
  address: string;
}
*/
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

/* REFACTORED barber.entity.ts
export interface BarberSettings {
  settings: {
    barberSelection: boolean;
    staff: Barber[];
  }
}

export interface Barber { id: string; name: string; visible?: boolean; imageUrl?: string; }
*/