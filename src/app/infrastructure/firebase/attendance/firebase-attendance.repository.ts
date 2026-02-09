import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, runTransaction, query, orderBy, limit, collectionData, Timestamp } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { AttendanceRepository } from '@application/attendance/attendance.repository.interface';
import { AttendanceRecord, StrikeEvent } from '@domain/attendance/attendance-record.entity';
import { TenantService } from '../../../config/tenant.service';

@Injectable({ providedIn: 'root' })
export class FirebaseAttendanceRepository implements AttendanceRepository {
  private firestore = inject(Firestore);
  private tenantService = inject(TenantService);

  private getCollectionRef() {
    const tenantId = this.tenantService.getTenantConfig().id;
    return collection(this.firestore, `hairdressers/${tenantId}/customer_behavior`);
  }

  async addStrike(phone: string, reason: string): Promise<void> {
    const docRef = doc(this.getCollectionRef(), phone);
    
    await runTransaction(this.firestore, async (transaction) => {
      const sfDoc = await transaction.get(docRef);
      
      const newEvent: { date: Timestamp, reason: string } = {
        date: Timestamp.now(),
        reason: reason || 'Sin observación'
      };

      if (!sfDoc.exists()) {
        transaction.set(docRef, {
          phone,
          strikeCount: 1,
          lastStrikeDate: newEvent.date,
          history: [newEvent]
        });
      } else {
        const data = sfDoc.data();
        const newCount = (data['strikeCount'] || 0) + 1;
        const currentHistory = data['history'] || [];
        
        transaction.update(docRef, {
          strikeCount: newCount,
          lastStrikeDate: newEvent.date,
          history: [...currentHistory, newEvent]
        });
      }
    });
  }

  getTopOffenders(limitCount: number): Observable<AttendanceRecord[]> {
    const q = query(
        this.getCollectionRef(), 
        orderBy('strikeCount', 'desc'), 
        limit(limitCount)
    );

    return collectionData(q).pipe(
      map((docs: any[]) => docs.map(d => {
        const history = (d.history || []).map((h: any) => ({
            date: (h.date as Timestamp).toDate(),
            reason: h.reason
        }));

        return new AttendanceRecord(
            d.phone,
            d.strikeCount,
            (d.lastStrikeDate as Timestamp).toDate(),
            history
        );
      }))
    );
  }
}
