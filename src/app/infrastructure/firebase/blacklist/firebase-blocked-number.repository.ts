import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, deleteDoc, getDoc, collectionData, Timestamp } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { BlockedNumberRepository } from '@application/blacklist/blocked-number.repository.interface';
import { BlockedNumber } from '@domain/blacklist/blocked-number.entity';
import { TenantService } from '../../../config/tenant.service';

@Injectable({ providedIn: 'root' })
export class FirebaseBlockedNumberRepository implements BlockedNumberRepository {
  private firestore = inject(Firestore);
  private tenantService = inject(TenantService);

  private getCollectionRef() {
    // Corregido: Usar getTenantConfig().id
    const tenantId = this.tenantService.getTenantConfig().id;
    return collection(this.firestore, `hairdressers/${tenantId}/blocked_phones`);
  }

  async isBlocked(phone: string): Promise<boolean> {
    if (!phone) return false;
    // Normalizamos el ID para búsqueda rápida (ej: +34666555444).
    // Asumimos que el teléfono ya viene en formato E.164 o consistente.
    const ref = doc(this.getCollectionRef(), phone);
    const snap = await getDoc(ref);
    return snap.exists();
  }

  async blockNumber(phone: string, reason: string): Promise<void> {
    const ref = doc(this.getCollectionRef(), phone);
    await setDoc(ref, {
      phone,
      reason,
      createdAt: Timestamp.now()
    });
  }

  async unblockNumber(phone: string): Promise<void> {
    const ref = doc(this.getCollectionRef(), phone);
    await deleteDoc(ref);
  }

  getBlockedNumbers(): Observable<BlockedNumber[]> {
    return collectionData(this.getCollectionRef(), { idField: 'id' }).pipe(
      map((docs: any[]) => docs.map(d => new BlockedNumber(
        d.phone,
        d.reason,
        (d['createdAt'] as Timestamp).toDate()
      )))
    );
  }
}
