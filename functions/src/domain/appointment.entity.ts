export interface Appointment {
  datetime: Date | string;
  createdAt: Date | string;
  service: {
    name: string;
    duration: number;
    price: number;
  };
  description?: string | null;
  name?: string | null;
  phone?: string | null;
  barber?: string | null;
  barberId?: string | null;
  barberName?: string | null;
  hairLengthChoice?: 'short' | 'medium' | 'long' | null;

  cancelationToken?: string;
}
