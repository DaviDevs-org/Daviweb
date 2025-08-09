import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface ReservedSlot {
  date: string; // "2025-08-10"
  time: string; // "10:30"
  id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReservedSlotsService {

  constructor(private firestore: Firestore) {}

  getReservedSlots(): Observable<ReservedSlot[]> {
    const slotsRef = collection(this.firestore, 'pruebas', 'data', 'reservedSlots');
    return collectionData(slotsRef, { idField: 'id' }) as Observable<ReservedSlot[]>;
  }
}
