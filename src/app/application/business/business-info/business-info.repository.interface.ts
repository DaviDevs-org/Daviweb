import { Observable } from 'rxjs';
import {ContactInfo, BarberSettings, Barber} from '@domain/index';

export abstract class BusinessInfoRepository {

  // Contact information
  abstract getContactInfo(): Observable<ContactInfo>;
  abstract updateContactInfo(contactInfo: ContactInfo): Promise<void>;

  // Barber settings
  abstract getBarberSettings(): Observable<BarberSettings>;
  abstract updateBarberSettings(settings: BarberSettings): Promise<void>;
  abstract updateBarberSelection(value: boolean): Promise<void>;
  abstract addBarber(barber: Barber): Promise<void>;
  abstract removeBarber(barber: Barber): Promise<void>;
  abstract editBarber(newBarber: Barber): Promise<void>;

}
