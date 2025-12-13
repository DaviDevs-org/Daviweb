import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { BusinessInfoRepository } from '@application/business';
import {
  collection,
  collectionData,
  doc,
  docData,
  Firestore,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc
} from '@angular/fire/firestore';
import { Observable, of, catchError, map, combineLatest } from 'rxjs';

import {
  ContactInfo,
  BarberSettings, Barber,
  BarberDTO,
} from '@domain/business-info';
import { deleteObject, ref, Storage } from '@angular/fire/storage';
import { SaasConfigService } from 'src/app/config/saas-config.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseBusinessInfoRepository implements BusinessInfoRepository {
  private pathConfig = inject(SaasConfigService).getDDBBPaths();
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private injector = inject(Injector);

  private contactInfoPath = this.pathConfig.contactInfo;
  private barberSettingsPath = this.pathConfig.barberSelection;
  private barbersPath = this.pathConfig.barbers;

  // ============= CONTACT INFO =============

  private getDefaultContactInfo() {
    return {
      phone: '+34 123 456 789',
      email: 'info@peluqueria.com',
      address: 'Calle Principal, 123\n28001 Madrid, España'
    };
  }

  getContactInfo(): Observable<ContactInfo> {
    if (!this.firestore) {
        console.error('Firebase Firestore is not initialized!');
        const defaults = this.getDefaultContactInfo();
        return of(new ContactInfo(defaults.phone, defaults.email, defaults.address));
    }
  
    return runInInjectionContext(this.injector, () => {
      const docRef = doc(this.firestore, this.contactInfoPath);
      return (docData(docRef) as Observable<any>).pipe(
        map(data => {
          const defaults = this.getDefaultContactInfo();
          if (!data || !data.contactInfo) {
            return new ContactInfo(defaults.phone, defaults.email, defaults.address);
          }
          return new ContactInfo(
              data.contactInfo.phone || defaults.phone,
              data.contactInfo.email || defaults.email,
              data.contactInfo.address || defaults.address
          );
        }),
        catchError(err => {
          console.error('Error getting contact info:', err);
          const defaults = this.getDefaultContactInfo();
          return of(new ContactInfo(defaults.phone, defaults.email, defaults.address));
        })
      );
    });
  }

  async updateContactInfo(contactInfo: ContactInfo): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.contactInfoPath);
      await setDoc(docRef, { contactInfo: contactInfo.toDTO() }, { merge: true });
    } catch (error) {
      console.error('Error updating contact info:', error);
      throw error;
    }
  }

  // ============= BARBER SETTINGS =============

  private getDefaultBarberSettings() {
    return {
      barberSelection: false,
      staff: []
    };
  }

  getBarberSettings(): Observable<BarberSettings> {
    return runInInjectionContext(this.injector, () => {
      const settingsDocRef = doc(this.firestore, this.barberSettingsPath);
      const settings$ = docData(settingsDocRef) as Observable<{ barberSelection: boolean } | undefined>;

      const barbersColRef = collection(this.firestore, this.barbersPath);
      // Map document ID to 'id' field in DTO
      const barbers$ = collectionData(barbersColRef, { idField: 'id' }) as Observable<BarberDTO[]>;

      return combineLatest([settings$, barbers$]).pipe(
        map(([settingsData, barbersDtos]) => {
          const barberSelection = settingsData?.barberSelection ?? false;
          const staff = barbersDtos.map(dto => Barber.fromDTO(dto));
          return new BarberSettings(barberSelection, staff);
        }),
        catchError(error => {
          console.error('Error obteniendo BarberSettings:', error);
          const defaults = this.getDefaultBarberSettings();
          return of(new BarberSettings(defaults.barberSelection, defaults.staff));
        })
      );
    });
  }

  async updateBarberSettings(settings: BarberSettings): Promise<void> {
    try {
      // 1. Update selection boolean
      await this.updateBarberSelection(settings.barberSelection);

      // 2. Update existing barbers (if any details changed)
      // We only update barbers that have an ID (meaning they exist in DB)
      const promises = settings.barbers.map(async (barber) => {
        if (barber.id) {
           const docRef = doc(this.firestore, `${this.barbersPath}/${barber.id}`);
           // We use updateDoc to avoid overwriting if it doesn't exist (though it should)
           // and to merge fields.
           // Note: toDTO() might include 'id', but updateDoc ignores it or saves it as field.
           // Ideally we strip 'id' from the data payload.
           const data = barber.toDTO();
           delete data.id; 
           await updateDoc(docRef, { ...data });
        }
      });
      
      await Promise.all(promises);

    } catch (error) {
      console.error('Error updating barber settings:', error);
      throw error;
    }
  }

  async updateBarberSelection(value: boolean): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.barberSettingsPath);
      await updateDoc(docRef, { barberSelection: value });
    } catch (error) {
      console.error('Error updating barber selection:', error);
      throw error;
    }
  }

  async addBarber(barber: Barber): Promise<void> {
    try {
      const colRef = collection(this.firestore, this.barbersPath);
      const data = barber.toDTO();
      delete data.id; // Let Firestore generate ID
      await addDoc(colRef, data);
    } catch (error) {
      console.error('Error adding barber:', error);
      throw error;
    }
  }

  async removeBarber(barber: Barber): Promise<void> {
    try {
      if (barber.imageUrl) {
        try {
          const imageRef = ref(this.storage, barber.imageUrl);
          await deleteObject(imageRef);
        } catch (e) {
          console.warn('No se pudo borrar la imagen del barber:', e);
        }
      }
      
      if (!barber.id) {
        console.warn('Intentando borrar barbero sin ID:', barber.name);
        // Fallback to name if ID is missing (legacy support or error recovery)
        // But with auto-IDs, name is not the ID.
        // We'll try to find by name? No, that's dangerous.
        // Just throw or return.
        throw new Error('Cannot remove barber without ID');
      }

      const docRef = doc(this.firestore, `${this.barbersPath}/${barber.id}`);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error removing barber:', error);
      throw error;
    }
  }

  async editBarber(oldBarber: Barber, newBarber: Barber): Promise<void> {
    try {
      if (!newBarber.id) {
         throw new Error('Cannot edit barber without ID');
      }
      
      const docRef = doc(this.firestore, `${this.barbersPath}/${newBarber.id}`);
      const data = newBarber.toDTO();
      delete data.id;
      await updateDoc(docRef, { ...data });
    } catch (error) {
      console.error('Error editing barber:', error);
      throw error;
    }
  }
}
