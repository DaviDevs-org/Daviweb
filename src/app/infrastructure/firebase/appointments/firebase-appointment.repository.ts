import {Injectable, runInInjectionContext, Injector, inject} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc, docData,
  Firestore, getDocs,
  orderBy,
  query,
  updateDoc, where
} from '@angular/fire/firestore';
import {AppointmentRepository} from '@application/appointments';
import {Observable} from 'rxjs';
import {Appointment} from '@domain/appointments';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAppointmentRepository implements AppointmentRepository {
  private path = 'pruebas/data/appointments';
  private firestore = inject(Firestore);
  private injector = inject(Injector);

  getAppointments(): Observable<Appointment[]> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, this.path);
      const q = query(ref, orderBy('datetime', 'asc'));
      return collectionData(q, { idField: 'id' }) as Observable<Appointment[]>;
    });
  }

  getAppointmentById(id: string): Observable<Appointment | null> {
    return runInInjectionContext(this.injector, () => {
      const docRef = doc(this.firestore, `${this.path}/${id}`);
      return docData(docRef, { idField: 'id' }) as Observable<Appointment | null>;
    });
  }

  getAppointmentsByDate(date: Date): Observable<Appointment[]> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, this.path);

      // Crear inicio y fin del día
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const q = query(
        ref,
        where('datetime', '>=', startOfDay),
        where('datetime', '<=', endOfDay),
        orderBy('datetime', 'asc')
      );

      return collectionData(q, { idField: 'id' }) as Observable<Appointment[]>;
    });
  }

  getAppointmentsByDateRange(startDate: Date, endDate: Date): Observable<Appointment[]> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, this.path);

      // Asegurar que startDate comienza al inicio del día
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      // Asegurar que endDate termina al final del día
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const q = query(
        ref,
        where('datetime', '>=', start),
        where('datetime', '<=', end),
        orderBy('datetime', 'asc')
      );

      return collectionData(q, { idField: 'id' }) as Observable<Appointment[]>;
    });
  }

  async addAppointment(appointment: Appointment) {
    const ref = collection(this.firestore, this.path);
    await addDoc(ref, appointment);
  }

  async updateAppointment(id: string, appointment: Appointment): Promise<void> {
    const d = doc(this.firestore, `${this.path}/${id}`);
    return updateDoc(d, { ...appointment });
  }

  async deleteAppointment(id: string) {
    // Borrar la cita
    const d = doc(this.firestore, `${this.path}/${id}`);
    await deleteDoc(d);

    // Borrar slots reservados asociados
    const reservedCol = collection(this.firestore, 'pruebas', 'data', 'reservedSlots');
    const qSlots = query(reservedCol, where('appointmentId', '==', id));
    const snaps = await getDocs(qSlots);
    const deletions: Promise<void>[] = [];
    snaps.forEach(s => deletions.push(deleteDoc(s.ref)));
    await Promise.all(deletions);
  }
  }
