import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { BusinessInfoRepository } from '@application/business-info';
import {
  addDoc, arrayRemove, arrayUnion,
  collection,
  collectionData, deleteDoc,
  doc, docData,
  Firestore,
  getDoc,
  orderBy,
  query, setDoc,
  updateDoc
} from '@angular/fire/firestore';
import { Observable, from, of, catchError, map } from 'rxjs';

import {
  ScheduleDay,
  ExceptionItem,
  ContactInfo,
  BarberSettings, Barber, BarberSettingsDTO
} from '@domain/business-info';
import {deleteObject, ref, Storage} from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class FirebaseBusinessInfoRepository implements BusinessInfoRepository {
  private firestore = inject(Firestore);
  private injector = inject(Injector);
  private storage = inject(Storage);

  private schedulePath = '/pruebas/data/info/schedule';
  private exceptionsPath = 'pruebas/data/exceptions';
  private contactInfoPath = '/pruebas/data/info/contact-info';
  private barberSettingsPath = 'pruebas/data/barber-settings/config';


  // ============= SCHEDULE =============

  private getDefaultSchedule() {
    return [
      { name: 'Lunes', day: 'lunes', intervals: [{ open: '09:00', close: '19:00' }], closed: false },
      { name: 'Martes', day: 'martes', intervals: [{ open: '09:00', close: '19:00' }], closed: false },
      { name: 'Miércoles', day: 'miércoles', intervals: [{ open: '09:00', close: '19:00' }], closed: false },
      { name: 'Jueves', day: 'jueves', intervals: [{ open: '09:00', close: '19:00' }], closed: false },
      { name: 'Viernes', day: 'viernes', intervals: [{ open: '09:00', close: '20:00' }], closed: false },
      { name: 'Sábado', day: 'sábado', intervals: [{ open: '09:00', close: '18:00' }], closed: true },
      { name: 'Domingo', day: 'domingo', intervals: [{ open: '10:00', close: '14:00' }], closed: true }
    ];
  }

  getSchedule(): Observable<ScheduleDay[]> {
    const placeRef = doc(this.firestore, this.schedulePath);

    return from(getDoc(placeRef)).pipe(
      map(snap => {
        const data = snap.data() as any;
        const scheduleData = data?.schedule ?? this.getDefaultSchedule();

        // Convertir DTOs a entidades del domain
        return scheduleData.map((dayDTO: any) => ScheduleDay.fromDTO(dayDTO));
      }),
      catchError(err => {
        console.error('Error getting schedule:', err);
        return of(this.getDefaultSchedule().map(dto => ScheduleDay.fromDTO(dto)));
      })
    );
  }

  async updateSchedule(schedule: ScheduleDay[]): Promise<void> {
    const docRef = doc(this.firestore, this.schedulePath);

    // Convertir las entidades del domain a DTOs planos para Firebase
    const scheduleDTOs = schedule.map(day => day.toDTO());

    await updateDoc(docRef, { schedule: scheduleDTOs });
  }

  // ============= EXCEPTIONS =============

  getExceptions(): Observable<ExceptionItem[]> {
    const collectionRef = collection(this.firestore, this.exceptionsPath);
    const q = query(collectionRef, orderBy('date', 'asc'));

    return collectionData(q, { idField: 'id' }).pipe(
      map((data: any[]) => data.map(dto => new ExceptionItem(
        dto.date,
        dto.reason,
        dto.type,
        dto.id  // si lo necesita
      )))
    );
  }

  async addException(exception: ExceptionItem): Promise<void> {
    const collectionRef = collection(this.firestore, this.exceptionsPath);
    const exceptionDTO = exception.toDTO();
    await addDoc(collectionRef, exceptionDTO);
  }

  async updateException(id: string, exception: ExceptionItem): Promise<void> {
    const docRef = doc(this.firestore, `${this.exceptionsPath}/${id}`);
    const exceptionDTO = { ...exception.toDTO() };  // spread operator
    await updateDoc(docRef, exceptionDTO);
  }

  async deleteException(id: string): Promise<void> {
    const docRef = doc(this.firestore, `${this.exceptionsPath}/${id}`);
    await deleteDoc(docRef);
  }



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

  async updateContactInfo(contactInfo: ContactInfo): Promise<void> {
    const docRef = doc(this.firestore, this.contactInfoPath);
    const contactDTO = {
      phone: contactInfo.phone,
      email: contactInfo.email,
      address: contactInfo.address
    };
    await updateDoc(docRef, { ...contactDTO });
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


  async updateBarberSettings(barberSettings: BarberSettings): Promise<void> {
    const docRef = doc(this.firestore, this.barberSettingsPath);

    const dto = barberSettings.toDTO();

    try {
      await updateDoc(docRef, { ...dto });
    } catch {
      await setDoc(docRef, { ...dto }, { merge: true });
    }
  }


  async updateBarberSelection(value: boolean): Promise<void> {
    const docRef = doc(this.firestore, this.barberSettingsPath);
    await updateDoc(docRef, { barberSelection: value });
  }

  async addBarber(barber: Barber): Promise<void> {
    const docRef = doc(this.firestore, this.barberSettingsPath);
    await updateDoc(docRef, { barbers: arrayUnion(barber.toDTO()) });
  }

  async removeBarber(barber: Barber): Promise<void> {
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
  }

  async editBarber(oldBarber: Barber, newBarber: Barber): Promise<void> {
    const docRef = doc(this.firestore, this.barberSettingsPath);
    await updateDoc(docRef, { barbers: arrayRemove(oldBarber.toDTO()) });
    await updateDoc(docRef, { barbers: arrayUnion(newBarber.toDTO()) });
  }

}
