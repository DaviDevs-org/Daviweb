import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { BusinessInfoRepository } from '@application/business';
import {
  arrayRemove, arrayUnion,
  doc, docData,
  Firestore,
  getDoc,
  setDoc,
  updateDoc
} from '@angular/fire/firestore';
import { Observable, from, of, catchError, map } from 'rxjs';

import {
  ContactInfo,
  BarberSettings, Barber, BarberSettingsDTO,
} from '@domain/business-info';
import { deleteObject, ref, Storage } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class FirebaseBusinessInfoRepository implements BusinessInfoRepository {
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private injector = inject(Injector);

  private contactInfoPath = '/pruebas/data/info/contact-info';
  private barberSettingsPath = 'pruebas/data/barber-settings/config';

  // ============= CONTACT INFO =============

  // Default contact info
  private getDefaultContactInfo() {
    return {
      phone: '+34 916 42 56 60',
      email: 'info@peluqueria.com',
      address: 'Calle Principal, 123\n28001 Madrid, España'
    };
  }

  getContactInfo(): Observable<ContactInfo> {
    const docRef = doc(this.firestore, this.contactInfoPath);

    return from(getDoc(docRef)).pipe(
      map(snap => {
        const data = snap.data() as any;

        if (!data) {
          return new ContactInfo(
            this.getDefaultContactInfo().phone,
            this.getDefaultContactInfo().email,
            this.getDefaultContactInfo().address
          );
        }

        return new ContactInfo(data.phone, data.email, data.address);
      }),
      catchError(err => {
        console.error('Error getting contact info:', err);
        const defaults = this.getDefaultContactInfo();
        return of(new ContactInfo(defaults.phone, defaults.email, defaults.address));
      })
    );
  }

  updateContactInfo(contactInfo: ContactInfo): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const docRef = doc(this.firestore, this.contactInfoPath);
      const contactDTO = {
        phone: contactInfo.phone,
        email: contactInfo.email,
        address: contactInfo.address
      };
      await updateDoc(docRef, { ...contactDTO });
    });
  }

  // ============= BARBER SETTINGS =============

  private getDefaultBarberSettings() {
    return {
      barberSelection: false,
      staff: []
    };
  }

  getBarberSettings(): Observable<BarberSettings> {
    const docRef = doc(this.firestore, this.barberSettingsPath);

    return docData(docRef).pipe(
      map((dto: any) => {
        // Si el documento no existe, docData devuelve null
        if (!dto) {
          return new BarberSettings(false, []);
        } else {
          return BarberSettings.fromDTO(dto as BarberSettingsDTO);
        }
      }),
      catchError(err => {
        console.error('Error getting barber settings:', err);
        return of(new BarberSettings(false, []));
      })
    );
  }


  updateBarberSettings(barberSettings: BarberSettings): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const docRef = doc(this.firestore, this.barberSettingsPath);
      const dto = barberSettings.toDTO();

      try {
        await updateDoc(docRef, { ...dto });
      } catch {
        await setDoc(docRef, { ...dto }, { merge: true });
      }
    });
  }


  updateBarberSelection(value: boolean): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const docRef = doc(this.firestore, this.barberSettingsPath);
      await updateDoc(docRef, { barberSelection: value });
    });
  }

  addBarber(barber: Barber): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const docRef = doc(this.firestore, this.barberSettingsPath);
      await updateDoc(docRef, { barbers: arrayUnion(barber.toDTO()) });
    });
  }

  removeBarber(barber: Barber): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const docRef = doc(this.firestore, this.barberSettingsPath);

      // Borrar imagen si existe
      if (barber.imageUrl) {
        try {
          const imageRef = ref(this.storage, barber.imageUrl);
          await deleteObject(imageRef);
        } catch (e) {
          console.warn('No se pudo borrar la imagen del barber o no existe:', e);
        }
      }

      await updateDoc(docRef, { barbers: arrayRemove(barber.toDTO()) });
    });
  }

  editBarber(oldBarber: Barber, newBarber: Barber): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const docRef = doc(this.firestore, this.barberSettingsPath);
      await updateDoc(docRef, { barbers: arrayRemove(oldBarber.toDTO()) });
      await updateDoc(docRef, { barbers: arrayUnion(newBarber.toDTO()) });
    });
  }

}
