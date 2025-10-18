import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
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
  private firestore = inject(Firestore);
  private injector = inject(Injector);

  /** Devuelve todos los reservedSlots desde "ahora" en adelante, como Observable */
  getReservedSlotsFromNow(): Observable<ReservedSlot[]> {
    return runInInjectionContext(this.injector, () => {
      const reservedCol = collection(this.firestore, 'pruebas', 'data', 'reservedSlots');
      const now = new Date();
      const q = query(
        reservedCol,
        where('datetime', '>=', now),
        orderBy('datetime', 'asc')
      );
      return collectionData(q, { idField: 'id' }) as Observable<ReservedSlot[]>;
    });
  }

  getReservedSlotsFrom(startDate: Date): Observable<ReservedSlot[]> {
    return runInInjectionContext(this.injector, () => {
      const reservedCol = collection(this.firestore, 'pruebas', 'data', 'reservedSlots');
      const q = query(
        reservedCol,
        where('datetime', '>=', startDate),
        orderBy('datetime', 'asc')
      );
      return collectionData(q, { idField: 'id' }) as Observable<ReservedSlot[]>;
    });
  }
}
