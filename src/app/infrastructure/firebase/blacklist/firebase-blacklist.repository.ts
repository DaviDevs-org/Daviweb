import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDoc, runTransaction, query, collectionData, Timestamp, setDoc, updateDoc, orderBy, serverTimestamp, getDocs, writeBatch, deleteDoc } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { BlacklistRepository } from '@application/blacklist/blacklist.repository.interface';
import { BlacklistEntry, Strike } from '@domain/blacklist/blacklist-entry.entity';
import { TenantService } from '../../../config/tenant.service';

@Injectable({ providedIn: 'root' })
export class FirebaseBlacklistRepository implements BlacklistRepository {
  private firestore = inject(Firestore);
  private tenantService = inject(TenantService);

  // Aseguramos que tenantService está listo, aunque injected should work.
  // En SSR/Initialization race conditions, getTenantConfig() podría ser undefined si se llama demasiado pronto.
  
  private getCollectionRef() {
    // Defensive check
    const config = this.tenantService.getTenantConfig();
    const tenantId = config ? config.id : 'default'; // Fallback por seguridad
    return collection(this.firestore, `hairdressers/${tenantId}/blacklist`);
  }

  // Helper para normalizar ID (sin +)
  private getPhoneHash(phone: string): string {
      return phone.replace(/^\+/, '');
  }

  getBlacklist(): Observable<BlacklistEntry[]> {
    const q = query(this.getCollectionRef(), orderBy('strikeCount', 'desc'));
    
    return collectionData(q, { idField: 'id' }).pipe(
      map((docs: any[]) => docs.map(d => {
        return new BlacklistEntry(
            d.phone || d.id, // Phone es el campo explicito, fallback al ID solo si falla
            d.isBlocked || false,
            d.strikeCount || 0,
            d.reason,
            d.alias,
            d.lastStrikeDate ? (d.lastStrikeDate as Timestamp).toDate() : undefined,
            d.blockedAt ? (d.blockedAt as Timestamp).toDate() : undefined
        );
      }))
    );
  }

  getStrikes(phone: string): Observable<Strike[]> {
      const phoneHash = this.getPhoneHash(phone);
      const strikesRef = collection(this.getCollectionRef(), phoneHash, 'strikes');
      const q = query(strikesRef, orderBy('date', 'desc'));

      return collectionData(q, { idField: 'id' }).pipe(
          map((docs: any[]) => docs.map(d => ({
              id: d.id,
              date: d.date ? (d.date as Timestamp).toDate() : new Date(), // Fallback seguro
              appointmentDate: d.appointmentDate ? (d.appointmentDate as Timestamp).toDate() : undefined,
              reason: d.reason,
              appointmentId: d.appointmentId,
              justified: d.justified
          } as Strike)))
      );
  }

  async isBlocked(phone: string): Promise<boolean> {
    const phoneHash = this.getPhoneHash(phone);
    const docRef = doc(this.getCollectionRef(), phoneHash);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) return false;
    
    const data = snap.data();
    return data['isBlocked'] === true;
  }

  async blockNumber(phone: string, reason?: string, alias?: string): Promise<void> {
    const phoneHash = this.getPhoneHash(phone);
    const docRef = doc(this.getCollectionRef(), phoneHash);
    
    // Usamos setDoc con merge, pero asegurando que strikeCount exista para las queries
    // Si el documento es nuevo, isBlocked=true, strikeCount=0
    // Si ya existe, solo actualiza isBlocked y reason, preservando strikeCount si lo hay
    const snap = await getDoc(docRef);
    const currentData = snap.exists() ? snap.data() : {};
    const currentStrikeCount = currentData['strikeCount'] !== undefined ? currentData['strikeCount'] : 0;

    await setDoc(docRef, {
        phone, 
        isBlocked: true,
        reason: reason || null,
        alias: alias || null,
        blockedAt: serverTimestamp(),
        strikeCount: currentStrikeCount // Aseguramos que el campo existe
    }, { merge: true });
  }

  async unblockNumber(phone: string): Promise<void> {
    const phoneHash = this.getPhoneHash(phone);
    const docRef = doc(this.getCollectionRef(), phoneHash);
    
    // Verificamos estado para limpieza
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const strikeCount = data['strikeCount'] || 0;

    if (strikeCount === 0) {
        // Si no tiene faltas y lo desbloqueamos -> Borramos el documento para no dejar basura
        await deleteDoc(docRef);
    } else {
        // Si tiene faltas, solo marcamos como no bloqueado
        await updateDoc(docRef, {
            isBlocked: false,
            blockedAt: null,
        });
    }
  }

  async addStrike(phone: string, reason?: string, appointmentId?: string, appointmentDate?: Date): Promise<void> {
    const phoneHash = this.getPhoneHash(phone);
    const docRef = doc(this.getCollectionRef(), phoneHash);
    const strikesRef = collection(docRef, 'strikes');

    await runTransaction(this.firestore, async (transaction) => {
      const sfDoc = await transaction.get(docRef);
      const newStrikeRef = doc(strikesRef);

      const now = Timestamp.now(); 
      const effectiveDate = appointmentDate ? Timestamp.fromDate(appointmentDate) : now;

      if (!sfDoc.exists()) {
        transaction.set(docRef, {
          phone, 
          isBlocked: false,
          strikeCount: 1,
          lastStrikeDate: effectiveDate
        });
      } else {
        const data = sfDoc.data();
        const newCount = (data['strikeCount'] || 0) + 1;
        
        transaction.update(docRef, {
            strikeCount: newCount,
            lastStrikeDate: effectiveDate
        });
      }

      const strikePayload: any = {
          date: effectiveDate,
          reason: reason || null
      };
      
      if (appointmentId) strikePayload.appointmentId = appointmentId;
      if (appointmentDate) strikePayload.appointmentDate = Timestamp.fromDate(appointmentDate);

      transaction.set(newStrikeRef, strikePayload);
    });
  }

  async deleteStrike(phone: string, strikeId: string): Promise<void> {
      const phoneHash = this.getPhoneHash(phone);
      const docRef = doc(this.getCollectionRef(), phoneHash);
      const strikeRef = doc(docRef, 'strikes', strikeId);

      await runTransaction(this.firestore, async (transaction) => {
          const strikeDoc = await transaction.get(strikeRef);
          if (!strikeDoc.exists()) {
              // Si la falta no existe, no hacemos nada (idempotencia)
              return;
          }

          const userDoc = await transaction.get(docRef);
          if (!userDoc.exists()) {
              return; // Inconsistente, pero salimos
          }

          transaction.delete(strikeRef);

          const data = userDoc.data();
          const currentCount = data['strikeCount'] || 0;
          const newCount = Math.max(0, currentCount - 1);
          const isBlocked = data['isBlocked'] || false;

          if (newCount === 0 && !isBlocked) {
              // Limpieza automática: Si 0 faltas y no bloqueado -> Borrar usuario
              transaction.delete(docRef);
          } else {
              transaction.update(docRef, {
                  strikeCount: newCount
              });
          }
      });
  }

  async updateStrike(phone: string, strikeId: string, data: Partial<Strike>): Promise<void> {
      const phoneHash = this.getPhoneHash(phone);
      const strikeRef = doc(this.getCollectionRef(), phoneHash, 'strikes', strikeId);
      
      const payload: any = {};
      if (data.reason !== undefined) payload.reason = data.reason;
      if (data.justified !== undefined) payload.justified = data.justified;

      if (Object.keys(payload).length > 0) {
          await updateDoc(strikeRef, payload);
      }
  }

  async resetStrikes(phone: string): Promise<void> {
      const phoneHash = this.getPhoneHash(phone);
      const docRef = doc(this.getCollectionRef(), phoneHash);
      const strikesRef = collection(docRef, 'strikes');
      
      // Batch para borrar subcoleccion
      const batch = writeBatch(this.firestore);
      const strikesSnapshot = await getDocs(strikesRef);
      
      strikesSnapshot.forEach(doc => {
          batch.delete(doc.ref);
      });

      // Verificamos estado para actualizar padre o borrar
      const userSnap = await getDoc(docRef);
      if (userSnap.exists()) {
          const data = userSnap.data();
          if (data['isBlocked']) {
              batch.update(docRef, { strikeCount: 0 });
          } else {
              batch.delete(docRef); // Si no está bloqueado y quitamos faltas -> Cleanup
          }
      }

      await batch.commit();
  }

  async updateEntry(phone: string, data: Partial<BlacklistEntry>): Promise<void> {
     const phoneHash = this.getPhoneHash(phone);
     const docRef = doc(this.getCollectionRef(), phoneHash);
     // Filtrar undefineds para no borrar datos accidentalmente
     const payload = Object.fromEntries(
         Object.entries(data).filter(([_, v]) => v !== undefined)
     );
     await updateDoc(docRef, payload);
  }
}
