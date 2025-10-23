import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  getDocs, addDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import {Appointment, AppointmentFirestore} from '../../admin-panel/types/admin.types';

@Injectable({ providedIn: 'root' })
export class AppointmentManagerService {
    private path = 'pruebas/data/appointments';
    private firestore = inject(Firestore);
    private injector = inject(Injector)

    getAppointments(): Observable<Appointment[]> {
        return runInInjectionContext(this.injector, () => {
            const ref = collection(this.firestore, this.path);
            const q = query(ref, orderBy('datetime', 'asc'));
            return collectionData(q, { idField: 'id' }) as Observable<Appointment[]>;
        });
    }

  async addAppointment(data: AppointmentFirestore) {
    const ref = collection(this.firestore, this.path);
    return await addDoc(ref, data);
  }


  async updateAppointment(id: string, data: Partial<AppointmentFirestore>) {
    const d = doc(this.firestore, `${this.path}/${id}`);
    return updateDoc(d, data);
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
