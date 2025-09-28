export class GalleryPhoto {
  name: string = "";
  url: string = "";
  lastModified: string = "";
  id?:string
  public imageLoaded?: boolean = false;

  constructor(name: string, url: string, lastModified: string, id:string){
    this.name = name;
    this.url = url;
    this.lastModified = lastModified;
    this.id = id
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
  // campos normalizados usados internamente
  dateISO?: string;
  timeNormalized?: string;
  duration?: string;
  service?: Service;
  barber?: string;
}

export class Service {
  constructor(
    public name: string,
    public description: string,
    public timeSegments: TimeSegment[], // Cambiar time por timeSegments
    public price: number,
    public imageUrl?: string,
    public id?: string
  ) {}

  // Calcular el tiempo total sumando todos los segmentos
  get totalTime(): number {
    return this.timeSegments.reduce((total, segment) => 
      total + segment.duration + (segment.breakAfter || 0), 0);
  }

  // Calcular solo el tiempo activo (sin breaks)
  get activeTime(): number {
    return this.timeSegments.reduce((total, segment) => total + segment.duration, 0);
  }

  toJson() {
    return {
      name: this.name,
      description: this.description,
      timeSegments: this.timeSegments,
      price: this.price,
      imageUrl: this.imageUrl
    };
  }
}

export interface TimeSegment {
  duration: number; // Duración en minutos del segmento activo
  breakAfter?: number; // Tiempo de descanso/pausa después de este segmento (opcional)
}

export interface NewService {
  name: string;
  price: number;
  description: string;
  timeSegments: TimeSegment[]; // Cambiar time por timeSegments
}

export interface ExceptionItem {
  date: string;
  closed: boolean;
  intervals: Interval[];
  exceptionType: 'closed' | 'custom';
  isEditing?: boolean;
}

export type Interval = {
  open: string;
  close: string;
  blocked?: boolean;
};


export interface ScheduleDay {
  day: string;
  name: string;
  closed: boolean;
  intervals: Interval[];
}


export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
}




export interface Statistics {
  monthlyClients: number;
  monthlyRevenue: number;
  averageRating: number;
  weeklyAppointments: number;
}

export type AdminTab = 'gallery' | 'services' | 'info' | 'stats';

export interface NavTab {
  id: AdminTab;
  icon: string;
  label: string;
}

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

export interface Barber {
  id:string;
  name: string;
  visible?: boolean;
  imageUrl?: string;
}

