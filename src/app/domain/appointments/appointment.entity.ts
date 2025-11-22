import { Service } from '../services/service.entity';

export interface Appointment {
  id?: string;
  createdAt?: any;
  date?: string;   // "YYYY-MM-DD"
  datetime?: any;
  description?: string;
  email?: string;
  name?: string;
  phone?: string;
  time?: string;   // "13:00"
  service?: Service;
  barber?: string;
  hairLengthChoice?: 'short' | 'medium' | 'long';
}
