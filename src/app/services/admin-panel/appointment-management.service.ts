import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Appointment } from '../../admin-panel/types/admin.types';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AppointmentManagerService {
  private path = 'pruebas/data/appointments';

  constructor(
    private firestore: Firestore,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  getAppointments(): Observable<Appointment[]> {
    const ref = collection(this.firestore, this.path);
    const q = isPlatformBrowser(this.platformId)
      ? query(ref, orderBy('datetime', 'asc'))
      : query(ref, orderBy('datetime', 'asc'), limit(5));
    return collectionData(q, { idField: 'id' }) as Observable<Appointment[]>;
  }

  async updateAppointment(id: string, data: Partial<Appointment>) {
    const d = doc(this.firestore, `${this.path}/${id}`);
    return updateDoc(d, data as any);
  }

  async deleteAppointment(id: string) {
    const d = doc(this.firestore, `${this.path}/${id}`);
    return deleteDoc(d);
  }
}
