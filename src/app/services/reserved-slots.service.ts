import { inject, Injectable, Injector, runInInjectionContext, Inject, PLATFORM_ID } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  orderBy,
  limit
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

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

  // Inyecta PLATFORM_ID para saber si estamos en SSR
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /** Devuelve todos los reservedSlots desde "ahora" en adelante, como Observable */
  getReservedSlotsFromNow(): Observable<ReservedSlot[]> {
    return runInInjectionContext(this.injector, () => {
      const reservedCol = collection(this.firestore, 'pruebas', 'data', 'reservedSlots');
      const now = new Date();

      // En SSR, limita a solo 10 resultados para evitar sobrecarga
      const q = isPlatformBrowser(this.platformId)
        ? query(
          reservedCol,
          where('datetime', '>=', now),
          orderBy('datetime', 'asc')
        )
        : query(
          reservedCol,
          where('datetime', '>=', now),
          orderBy('datetime', 'asc'),
          limit(10)
        );

      return collectionData(q, { idField: 'id' }) as Observable<ReservedSlot[]>;
    });
  }

  getReservedSlotsFrom(startDate: Date): Observable<ReservedSlot[]> {
    return runInInjectionContext(this.injector, () => {
      const reservedCol = collection(this.firestore, 'pruebas', 'data', 'reservedSlots');

      const q = isPlatformBrowser(this.platformId)
        ? query(
          reservedCol,
          where('datetime', '>=', startDate),
          orderBy('datetime', 'asc')
        )
        : query(
          reservedCol,
          where('datetime', '>=', startDate),
          orderBy('datetime', 'asc'),
          limit(10)
        );

      return collectionData(q, { idField: 'id' }) as Observable<ReservedSlot[]>;
    });
  }
}
