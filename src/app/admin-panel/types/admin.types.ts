// shared/types/admin.types.ts
export class GalleryPhoto {
  name: string = "";
  url: string = "";
  lastModified: string = "";
  id?:string

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
}
export class Service {
  id?: string;
  name: string = "";
  price: number = 0;
  description: string = "";
  time: number = 0;
  imageUrl?: string;

  constructor(name:string, description:string, time:number, price:number){
      this.name = name;
      this.description = description;
      this.time = time;
      this.price = price;
    }
  toJson(){
    return {
      ...(this.id && {id:this.id}),
      name: this.name,
      price: this.price,
      description: this.description,
      time: this.time
    }
  }
}

export interface NewService {
  name: string;
  price: number;
  description: string;
  time: number;
}
export interface ScheduleDay {
  name: string;
  day: string;
  open: string;
  close: string;
  closed: boolean;
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