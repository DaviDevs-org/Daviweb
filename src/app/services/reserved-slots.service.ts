// src/app/services/reserved-slots.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  orderBy
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface ReservedSlot {
  id?: string;
  date: string;
  time: string;
  datetime?: any; // Firestore timestamp / Date
  createdAt?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ReservedSlotsService {
  constructor(private firestore: Firestore) {}

  /**
   * Devuelve todos los reservedSlots desde "ahora" en adelante,
   * ordenados por datetime ascendente.
   */
  getReservedSlotsFromNow(): Observable<ReservedSlot[]> {
    const reservedCol = collection(this.firestore, 'pruebas', 'data', 'reservedSlots');

    const now = new Date(); // momento de la consulta
    const q = query(
      reservedCol,
      where('datetime', '>=', now),
      orderBy('datetime', 'asc')
    );

    return collectionData(q, { idField: 'id' }) as Observable<ReservedSlot[]>;
  }


  getReservedSlotsFrom(startDate: Date): Observable<ReservedSlot[]> {
    const reservedCol = collection(this.firestore, 'pruebas', 'data', 'reservedSlots');
    const q = query(
      reservedCol,
      where('datetime', '>=', startDate),
      orderBy('datetime', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<ReservedSlot[]>;
  }
}
