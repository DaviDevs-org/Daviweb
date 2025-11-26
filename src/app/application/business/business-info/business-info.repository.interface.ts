import { Observable } from 'rxjs';
import {ContactInfo, BarberSettings, Barber} from '@domain/index';

export abstract class BusinessInfoRepository {

  // Contact information
  abstract getContactInfo(): Observable<ContactInfo>;
  abstract updateContactInfo(contactInfo: ContactInfo): Promise<void>;

  // Barber settings
  abstract getBarberSettings(): Observable<BarberSettings>;
  abstract updateBarberSettings(barberSettings: BarberSettings): Promise<void>;
  abstract addBarber(barber: Barber): Promise<void>;
  abstract removeBarber(barber: Barber): Promise<void>;
  abstract editBarber(oldBarber: Barber, newBarber: Barber): Promise<void>;

}
