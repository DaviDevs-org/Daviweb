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
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { ScheduleRepository } from '@application/business';
import {
  ExceptionItem,
  ExceptionItemDTO,
  ReservedSlot,
  ReservedSlotDTO,
  ScheduleDay,
  ScheduleDayDTO,
} from '@domain/business-info';
import { catchError, map, Observable, of } from 'rxjs';
import { SaasConfigService } from 'src/app/config/saas-config.service';

@Injectable({
  providedIn: 'root',
})
export class FirebaseScheduleRepository implements ScheduleRepository {
  private pathConfig = inject(SaasConfigService).getDDBBPaths();
  private firestore = inject(Firestore);
  private injector = inject(Injector);

  private schedulePath = this.pathConfig.schedule;
  private exceptionsPath = this.pathConfig.exceptions;
  private slotsPath = this.pathConfig.reservedSlots;

  private getDefaultSchedule() {
    return [
      {
        name: 'Lunes',
        day: 'lunes',
        intervals: [{ open: '09:00', close: '19:00' }],
        closed: false,
      },
      {
        name: 'Martes',
        day: 'martes',
        intervals: [{ open: '09:00', close: '19:00' }],
        closed: false,
      },
      {
        name: 'Miércoles',
        day: 'miércoles',
        intervals: [{ open: '09:00', close: '19:00' }],
        closed: false,
      },
      {
        name: 'Jueves',
        day: 'jueves',
        intervals: [{ open: '09:00', close: '19:00' }],
        closed: false,
      },
      {
        name: 'Viernes',
        day: 'viernes',
        intervals: [{ open: '09:00', close: '20:00' }],
        closed: false,
      },
      {
        name: 'Sábado',
        day: 'sábado',
        intervals: [{ open: '09:00', close: '18:00' }],
        closed: true,
      },
      {
        name: 'Domingo',
        day: 'domingo',
        intervals: [{ open: '10:00', close: '14:00' }],
        closed: true,
      },
    ];
  }

  // ============= SCHEDULE =============
  getSchedule(): Observable<ScheduleDay[]> {
    if (!this.firestore) {
      console.error('Firebase Firestore is not initialized!');
      return of(
        this.getDefaultSchedule().map((dto) => ScheduleDay.fromDTO(dto))
      );
    }
    const placeRef = doc(this.firestore, this.schedulePath);

    return runInInjectionContext(this.injector, () => {
      return (docData(placeRef) as Observable<any>).pipe(
        map((data) => {
          const scheduleData = data?.schedule ?? this.getDefaultSchedule();
          // Convertir DTOs a entidades del domain
          return scheduleData.map((dayDTO: ScheduleDayDTO) =>
            ScheduleDay.fromDTO(dayDTO)
          );
        }),
        catchError((err) => {
          if (err.code === 'permission-denied') {
            console.warn(
              'Permisos insuficientes para leer el horario. Usando horario por defecto.'
            );
          } else {
            console.error('Error getting schedule:', err);
          }
          return of(
            this.getDefaultSchedule().map((dto) => ScheduleDay.fromDTO(dto))
          );
        })
      );
    });
  }

  async updateSchedule(schedule: ScheduleDay[]): Promise<void> {
    await runInInjectionContext(this.injector, async () => {
      const docRef = doc(this.firestore, this.schedulePath);
      const scheduleDTOs = schedule.map((day) => day.toDTO());
      try {
        await updateDoc(docRef, { schedule: scheduleDTOs });
      } catch {
        await setDoc(docRef, { schedule: scheduleDTOs }, { merge: true });
      }
    });
  }

  // ============= EXCEPTIONS =============

  getExceptions(): Observable<ExceptionItem[]> {
    if (!this.firestore) {
      console.error('Firebase Firestore is not initialized!');
      return of([]);
    }
    const collectionRef = collection(this.firestore, this.exceptionsPath);

    return runInInjectionContext(this.injector, () => {
      return (
        collectionData(collectionRef, { idField: 'id' }) as Observable<
          ExceptionItemDTO[]
        >
      ).pipe(
        map((dtos) => dtos.map((dto) => ExceptionItem.fromDTO(dto))),
        catchError((err) => {
          if (err.code === 'permission-denied') {
            console.warn(
              'Permisos insuficientes para leer excepciones. Usando lista vacía.'
            );
          } else {
            console.error('Error getting exceptions:', err);
          }
          return of([]);
        })
      );
    });
  }

  async addException(exception: ExceptionItem): Promise<void> {
    await runInInjectionContext(this.injector, async () => {
      const collectionRef = collection(this.firestore, this.exceptionsPath);
      const exceptionDTO = exception.toDTO();
      await addDoc(collectionRef, exceptionDTO);
    });
  }

  async updateException(id: string, exception: ExceptionItem): Promise<void> {
    await runInInjectionContext(this.injector, async () => {
      const docRef = doc(this.firestore, `${this.exceptionsPath}/${id}`);
      const exceptionDTO = { ...exception.toDTO() };
      await updateDoc(docRef, exceptionDTO);
    });
  }

  async deleteException(id: string): Promise<void> {
    await runInInjectionContext(this.injector, async () => {
      const docRef = doc(this.firestore, `${this.exceptionsPath}/${id}`);
      await deleteDoc(docRef);
    });
  }

  // ============= SLOTS =============
  getSlots(): Observable<ReservedSlot[]> {
    return runInInjectionContext(this.injector, () => {
      const collectionRef = collection(this.firestore, this.slotsPath);
      return (
        collectionData(collectionRef, { idField: 'id' }) as Observable<
          ReservedSlotDTO[]
        >
      ).pipe(
        map((dtos) => dtos.map((dto) => ReservedSlot.fromDTO(dto))),
        catchError((err) => {
          if (err.code === 'permission-denied') {
            console.warn(
              'Permisos insuficientes para leer slots. Usando lista vacía.'
            );
          } else {
            console.error('Error getting slots:', err);
          }
          return of([]);
        })
      );
    });
  }

  async addSlot(slot: ReservedSlot): Promise<void> {
    await runInInjectionContext(this.injector, async () => {
      const collectionRef = collection(this.firestore, this.slotsPath);
      const slotDTO = slot.toDTO();
      await addDoc(collectionRef, slotDTO);
    });
  }

  async deleteSlot(id: string): Promise<void> {
    await runInInjectionContext(this.injector, async () => {
      const docRef = doc(this.firestore, `${this.slotsPath}/${id}`);
      await deleteDoc(docRef);
    });
  }
}
