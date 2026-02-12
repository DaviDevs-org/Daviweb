import {
  inject,
  Injectable,
  Injector,
  runInInjectionContext,
} from '@angular/core';
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
  where,
} from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { AppointmentRepository } from '@application/appointments';
import { Appointment, AppointmentDTO } from '@domain/appointments';
import {
  catchError,
  distinctUntilChanged,
  from,
  map,
  Observable,
  of,
  switchMap,
} from 'rxjs';
import { SaasConfigService } from 'src/app/config/saas-config.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class FirebaseAppointmentRepository implements AppointmentRepository {
  private saasConfigService = inject(SaasConfigService);
  private pathConfig = this.saasConfigService.getDDBBPaths();
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private injector = inject(Injector);

  private ownerReadAccess$(): Observable<boolean> {
    const tenantId = this.saasConfigService.getAll().id;

    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user) return of(false);

        return from(user.getIdTokenResult()).pipe(
          map((tokenResult) => {
            const role = tokenResult.claims['role'];
            const tokenTenantId = tokenResult.claims['tenantId'];
            return role === 'owner' && tokenTenantId === tenantId;
          }),
          catchError((err) => {
            console.error('Error validating owner claims:', err);
            return of(false);
          })
        );
      }),
      distinctUntilChanged()
    );
  }

  getAppointments(): Observable<Appointment[]> {
    return runInInjectionContext(this.injector, () => {
      return this.ownerReadAccess$().pipe(
        switchMap((hasAccess) => {
          if (!hasAccess) return of([]);

          const ref = collection(this.firestore, this.pathConfig.appointments);
          const q = query(ref, orderBy('datetime', 'asc'));

          return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
            map((docs) => docs.map((doc) => this.mapToDomain(doc))),
            catchError((err) => {
              console.error('Error getting appointments:', err);
              return of([]);
            })
          );
        })
      );
    });
  }

  getAppointmentById(id: string): Observable<Appointment | null> {
    const docRef = doc(this.firestore, `${this.pathConfig.appointments}/${id}`);

    return runInInjectionContext(this.injector, () => {
      return this.ownerReadAccess$().pipe(
        switchMap((hasAccess) => {
          if (!hasAccess) return of(null);

          return (docData(docRef, { idField: 'id' }) as Observable<any>).pipe(
            map((doc) => (doc ? this.mapToDomain(doc) : null)),
            catchError((err) => {
              console.error(`Error getting appointment ${id}:`, err);
              return of(null);
            })
          );
        })
      );
    });
  }

  getAppointmentsByDate(date: Date): Observable<Appointment[]> {
    // Crear inicio y fin del día
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return runInInjectionContext(this.injector, () => {
      return this.ownerReadAccess$().pipe(
        switchMap((hasAccess) => {
          if (!hasAccess) return of([]);

          const ref = collection(this.firestore, this.pathConfig.appointments);
          const q = query(
            ref,
            where('datetime', '>=', startOfDay),
            where('datetime', '<=', endOfDay),
            orderBy('datetime', 'asc')
          );

          return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
            map((docs) => docs.map((doc) => this.mapToDomain(doc))),
            catchError((err) => {
              console.error('Error getting appointments by date:', err);
              return of([]);
            })
          );
        })
      );
    });
  }

  getAppointmentsByDateRange(
    startDate: Date,
    endDate: Date
  ): Observable<Appointment[]> {
    // Asegurar que startDate comienza al inicio del día
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    // Asegurar que endDate termina al final del día
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return runInInjectionContext(this.injector, () => {
      return this.ownerReadAccess$().pipe(
        switchMap((hasAccess) => {
          if (!hasAccess) return of([]);

          const ref = collection(this.firestore, this.pathConfig.appointments);
          const q = query(
            ref,
            where('datetime', '>=', start),
            where('datetime', '<=', end),
            orderBy('datetime', 'asc')
          );

          return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
            map((docs) => docs.map((doc) => this.mapToDomain(doc))),
            catchError((err) => {
              console.error('Error getting appointments by range:', err);
              return of([]);
            })
          );
        })
      );
    });
  }

  async addAppointment(appointment: Appointment): Promise<string> {
    return await runInInjectionContext(this.injector, async () => {
      const ref = collection(this.firestore, this.pathConfig.appointments);
      const tenantId = this.saasConfigService.getAll().id;
      const dto: AppointmentDTO = {
        ...appointment.toDTO(),
        tenantId,
        cancelationToken: uuidv4(),
      };
      const docRef = await addDoc(ref, dto);
      return docRef.id;
    });
  }

  async updateAppointment(id: string, appointment: Appointment): Promise<void> {
    return await runInInjectionContext(this.injector, async () => {
      const d = doc(this.firestore, `${this.pathConfig.appointments}/${id}`);
      await updateDoc(d, { ...appointment.toDTO() });
    });
  }

  async deleteAppointment(id: string): Promise<void> {
    return await runInInjectionContext(this.injector, async () => {
      // 1) Borrar la cita
      const d = doc(this.firestore, `${this.pathConfig.appointments}/${id}`);
      await deleteDoc(d);

      // 2) Borrar slots reservados asociados
      const reservedCol = collection(
        this.firestore,
        this.pathConfig.reservedSlots
      );
      const qSlots = query(reservedCol, where('appointmentId', '==', id));

      try {
        const snaps = await runInInjectionContext(this.injector, () =>
          getDocs(qSlots)
        );
        const deletions: Promise<void>[] = [];
        snaps.forEach((s) =>
          deletions.push(
            runInInjectionContext(this.injector, () => deleteDoc(s.ref))
          )
        );
        await Promise.all(deletions);
      } catch (error) {
        console.error('Error deleting associated slots:', error);
        // No relanzamos para no romper la operación principal
      }
    });
  }

  private mapToDomain(data: any): Appointment {
    const datetime =
      data.datetime instanceof Timestamp
        ? data.datetime.toDate()
        : typeof data.datetime === 'string'
        ? new Date(data.datetime)
        : data.datetime;

    const createdAt =
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : typeof data.createdAt === 'string'
        ? new Date(data.createdAt)
        : data.createdAt || new Date();

    const dto: AppointmentDTO = {
      ...data,
      datetime,
      createdAt,
    };

    return Appointment.fromDTO(dto, data.id);
  }
}
