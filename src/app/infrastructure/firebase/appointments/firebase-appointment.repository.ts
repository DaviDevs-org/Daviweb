import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  Firestore,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where
} from '@angular/fire/firestore';
import { AppointmentRepository } from '@application/appointments';
import { Appointment, AppointmentDTO } from '@domain/appointments';
import { catchError, map, Observable, of } from 'rxjs';
import { SaasConfigService } from 'src/app/config/saas-config.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAppointmentRepository implements AppointmentRepository {
  private pathConfig = inject(SaasConfigService).getDDBBPaths();
  private firestore = inject(Firestore);

  getAppointments(): Observable<Appointment[]> {
    const ref = collection(this.firestore, this.pathConfig.appointments);
    const q = query(ref, orderBy('datetime', 'asc'));
    
    return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
      map(docs => docs.map(doc => this.mapToDomain(doc))),
      catchError(err => {
        console.error('Error getting appointments:', err);
        return of([]);
      })
    );
  }

  getAppointmentById(id: string): Observable<Appointment | null> {
    const docRef = doc(this.firestore, `${this.pathConfig.appointments}/${id}`);
    
    return (docData(docRef, { idField: 'id' }) as Observable<any>).pipe(
      map(doc => doc ? this.mapToDomain(doc) : null),
      catchError(err => {
        console.error(`Error getting appointment ${id}:`, err);
        return of(null);
      })
    );
  }

  getAppointmentsByDate(date: Date): Observable<Appointment[]> {
    const ref = collection(this.firestore, this.pathConfig.appointments);

    // Crear inicio y fin del día
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      ref,
      where('datetime', '>=', startOfDay),
      where('datetime', '<=', endOfDay),
      orderBy('datetime', 'asc')
    );

    return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
      map(docs => docs.map(doc => this.mapToDomain(doc))),
      catchError(err => {
        console.error('Error getting appointments by date:', err);
        return of([]);
      })
    );
  }

  getAppointmentsByDateRange(startDate: Date, endDate: Date): Observable<Appointment[]> {
    const ref = collection(this.firestore, this.pathConfig.appointments);

    // Asegurar que startDate comienza al inicio del día
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    // Asegurar que endDate termina al final del día
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const q = query(
      ref,
      where('datetime', '>=', start),
      where('datetime', '<=', end),
      orderBy('datetime', 'asc')
    );

    return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
      map(docs => docs.map(doc => this.mapToDomain(doc))),
      catchError(err => {
        console.error('Error getting appointments by range:', err);
        return of([]);
      })
    );
  }

  async addAppointment(appointment: Appointment): Promise<string> {
    const ref = collection(this.firestore, this.pathConfig.appointments);
    const docRef = await addDoc(ref, appointment.toDTO());
    return docRef.id;
  }

  async updateAppointment(id: string, appointment: Appointment): Promise<void> {
    const d = doc(this.firestore, `${this.pathConfig.appointments}/${id}`);
    await updateDoc(d, { ...appointment.toDTO() });
  }

  async deleteAppointment(id: string): Promise<void> {
    // Borrar la cita
    const d = doc(this.firestore, `${this.pathConfig.appointments}/${id}`);
    await deleteDoc(d);

    // Borrar slots reservados asociados
    const reservedCol = collection(this.firestore, this.pathConfig.reservedSlots);
    const qSlots = query(reservedCol, where('appointmentId', '==', id));
    
    try {
      const snaps = await getDocs(qSlots);
      const deletions: Promise<void>[] = [];
      snaps.forEach(s => deletions.push(deleteDoc(s.ref)));
      await Promise.all(deletions);
    } catch (error) {
      console.error('Error deleting associated slots:', error);
      // No lanzamos error para no fallar la operación principal si esto falla
    }
  }

  private mapToDomain(data: any): Appointment {
    const datetime = data.datetime instanceof Timestamp 
      ? data.datetime.toDate() 
      : (typeof data.datetime === 'string' ? new Date(data.datetime) : data.datetime);

    const createdAt = data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : (typeof data.createdAt === 'string' ? new Date(data.createdAt) : (data.createdAt || new Date()));

    const dto: AppointmentDTO = {
      ...data,
      datetime,
      createdAt
    };

    return Appointment.fromDTO(dto, data.id);
  }
}
