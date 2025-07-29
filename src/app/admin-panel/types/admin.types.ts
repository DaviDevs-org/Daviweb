// shared/types/admin.types.ts
export interface GalleryPhoto {
  id: string;
  url: string;
  title: string;
  uploadDate: Date;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
  active: boolean;
}

export interface NewService {
  name: string;
  price: number;
  description: string;
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