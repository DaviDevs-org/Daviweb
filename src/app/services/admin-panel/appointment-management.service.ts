// src/app/services/appointment.service.ts
import { Injectable } from '@angular/core';
import {
    Firestore,
    collection,
    collectionData,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Appointment } from '../../admin-panel/types/admin.types';

@Injectable({ providedIn: 'root' })
export class AppointmentManagerService {
    private path = 'pruebas/data/appointments';

    constructor(private firestore: Firestore) { }

    getAppointments(): Observable<Appointment[]> {
        const ref = collection(this.firestore, this.path);
        const q = query(ref, orderBy('datetime', 'asc'));
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
