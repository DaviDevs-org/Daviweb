import { AppointmentService, ServiceDTO } from '@domain/services/service.types';

export interface TimeSegment {
  duration: number; // Duración en minutos del segmento activo
  breakAfter?: number; // Tiempo de descanso/pausa después de este segmento (opcional)
}

export interface HairLengthModifier {
  time: number; // sigue valiendo para los casos simples
  segments?: TimeSegment[]; // añadimos esto para los casos con segmentos específicos
  price?: number;
}

// Solo guardamos extraTime ahora
export type HairLengthModifiers = {
  short: HairLengthModifier;
  medium: HairLengthModifier;
  long: HairLengthModifier;
};

export interface HourRange {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
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
      long: { time: 60 },
    },
    public imageUrl?: string,
    public id?: string,
    public hourRange?: HourRange,
    public basePrice?: number,
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

  // Devuelve el precio del servicio (si lo hay)
  getPrice(length?: 'short' | 'medium' | 'long'): number {
    if (
      this.requiresHairLength &&
      length &&
      this.hairLengthModifiers?.[length]
    ) {
      const specificPrice = this.hairLengthModifiers[length].price;
      return specificPrice !== undefined && specificPrice > 0
        ? specificPrice
        : this.basePrice || 0;
    } else {
      return this.basePrice || 0;
    }
  }

  // Crea una instancia equivalente a un "servicio normal" para esa longitud
  materializeForLength(length: 'short' | 'medium' | 'long'): Service {
    const segments = this.getTimeSegmentsForLength(length);
    const priceForLength = this.getPrice(length);

    return new Service(
      this.name,
      this.description,
      segments,
      /* requiresHairLength */ false,
      this.hairLengthModifiers,
      this.imageUrl,
      this.id,
      this.hourRange,
      priceForLength,
    );
  }

  // Calcula el tiempo total (segmentos + descansos)
  computeTotalTime(hairLength?: 'short' | 'medium' | 'long'): number {
    if (
      this.requiresHairLength &&
      hairLength &&
      this.hairLengthModifiers?.[hairLength]
    ) {
      const modifier = this.hairLengthModifiers[hairLength];
      if (modifier.segments?.length) {
        return modifier.segments.reduce(
          (sum, seg) => sum + seg.duration + (seg.breakAfter || 0),
          0,
        );
      }
      return modifier.time;
    }

    if (this.timeSegments?.length) {
      return this.timeSegments.reduce(
        (sum, seg) => sum + seg.duration + (seg.breakAfter || 0),
        0,
      );
    }

    return 30; // fallback
  }

  // Calcula solo tiempo activo sin pausas
  getActiveTime(hairLength?: 'short' | 'medium' | 'long'): number {
    if (
      this.requiresHairLength &&
      hairLength &&
      this.hairLengthModifiers?.[hairLength]
    ) {
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
          const total = modifier.segments.reduce(
            (sum, seg) => sum + seg.duration + (seg.breakAfter || 0),
            0,
          );
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
        const totalGlobal = this.timeSegments.reduce(
          (sum, seg) => sum + seg.duration + (seg.breakAfter || 0),
          0,
        );
        return `${totalGlobal} min`;
      }
      return '30 min';
    }

    // Servicio normal (sin longitudes). Si tiene breaks, mostrar rango activo-total
    if (this.timeSegments?.length) {
      const active = this.timeSegments.reduce(
        (sum, seg) => sum + seg.duration,
        0,
      );
      const total = this.timeSegments.reduce(
        (sum, seg) => sum + seg.duration + (seg.breakAfter || 0),
        0,
      );
      return active === total ? `${total} min` : `${active}-${total} min`;
    }

    return '30 min'; // fallback para datos muy antiguos
  }

  // Exporta a JSON limpio para Firestore
  toDTO(): ServiceDTO {
    const base: ServiceDTO = {
      name: this.name,
      description: this.description,
      timeSegments: this.timeSegments,
      imageUrl: this.imageUrl,
      requiresHairLength: this.requiresHairLength,
      hairLengthModifiers: this.hairLengthModifiers,
      basePrice: this.basePrice,
    };
    if (this.hourRange) {
      base.hourRange = { ...this.hourRange };
    }
    return base;
  }

  // Exporta al formato que guarda Appointment
  toAppointmentService(
    length?: 'short' | 'medium' | 'long',
  ): AppointmentService {
    const out: AppointmentService = {
      name: this.name,
      timeSegments: this.timeSegments,
      priceAtBooking: this.getPrice(length),
    };
    return out;
  }

  static fromDTO(dto: ServiceDTO, id?: string): Service {
    return new Service(
      dto.name,
      dto.description,
      dto.timeSegments || [],
      dto.requiresHairLength || false,
      dto.hairLengthModifiers || Service.defaultHairLengthModifiers(),
      dto.imageUrl,
      id || dto.id,
      dto.hourRange,
      dto.basePrice,
    );
  }

  static defaultHairLengthModifiers(): HairLengthModifiers {
    return {
      short: { time: 30 },
      medium: { time: 45 },
      long: { time: 60 },
    };
  }

  static createEmpty(): Service {
    return new Service(
      '',
      '',
      [{ duration: 30, breakAfter: 0 }],
      false,
      Service.defaultHairLengthModifiers(),
    );
  }

  validate(): string | null {
    if (!this.name.trim()) {
      return 'Por favor, ingresa el nombre del servicio.';
    }

    if (this.requiresHairLength) {
      if (!this.hairLengthModifiers) {
        return 'Configuración de longitud de pelo inválida.';
      }

      const lengths: Array<'short' | 'medium' | 'long'> = [
        'short',
        'medium',
        'long',
      ];
      let allValid = true;
      for (const l of lengths) {
        const mod = this.hairLengthModifiers[l];
        const segsTotal = (mod.segments ?? []).reduce(
          (a, s) => a + (s.duration || 0) + (s.breakAfter || 0),
          0,
        );
        const total = segsTotal > 0 ? segsTotal : mod.time || 0;
        if (total <= 0) {
          allValid = false;
          break;
        }
      }
      if (!allValid) {
        return 'Configura un tiempo válido para cada longitud de pelo.';
      }
    } else {
      const hasValidSegment = this.timeSegments.some((seg) => seg.duration > 0);
      if (!hasValidSegment) {
        return 'Por favor, ingresa al menos un segmento de tiempo válido.';
      }
    }

    if (this.hourRange) {
      const start = this.hourRange.start || '';
      const end = this.hourRange.end || '';
      if (!start || !end) {
        return 'Indica hora de inicio y fin del rango.';
      }

      const timeToMinutes = (time: string): number => {
        const [h, m] = (time || '0:0').split(':').map(Number);
        return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
      };

      if (timeToMinutes(end) <= timeToMinutes(start)) {
        return 'El fin del rango debe ser posterior al inicio.';
      }
    }

    return null;
  }
}
