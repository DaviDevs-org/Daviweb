import { inject, Injectable, Injector, runInInjectionContext } from "@angular/core";
import { addDoc, collection, deleteDoc, doc, Firestore, getDoc, getDocs, updateDoc } from "@angular/fire/firestore";
import { ScheduleRepository } from "@application/business";
import { ExceptionItem, ExceptionItemDTO, ReservedSlot, ReservedSlotDTO, ScheduleDay, ScheduleDayDTO } from "@domain/business-info";
import { catchError, from, map, Observable, of } from "rxjs";

Injectable({
    providedIn: "root"
})

export class FirebaseScheduleRepository implements ScheduleRepository {
    private firestore = inject(Firestore);
    private injector = inject(Injector);

    private schedulePath = '/pruebas/data/info/schedule';
    private exceptionsPath = '/pruebas/data/info/schedule/exceptions';
    private slotsPath = '/pruebas/data/info/schedule/slots';

    private getDefaultSchedule() {
        return [
            { name: 'Lunes', day: 'lunes', intervals: [{ open: '09:00', close: '19:00' }], closed: false },
            { name: 'Martes', day: 'martes', intervals: [{ open: '09:00', close: '19:00' }], closed: false },
            { name: 'Miércoles', day: 'miércoles', intervals: [{ open: '09:00', close: '19:00' }], closed: false },
            { name: 'Jueves', day: 'jueves', intervals: [{ open: '09:00', close: '19:00' }], closed: false },
            { name: 'Viernes', day: 'viernes', intervals: [{ open: '09:00', close: '20:00' }], closed: false },
            { name: 'Sábado', day: 'sábado', intervals: [{ open: '09:00', close: '18:00' }], closed: true },
            { name: 'Domingo', day: 'domingo', intervals: [{ open: '10:00', close: '14:00' }], closed: true }
        ];
    }

    // ============= SCHEDULE =============
    getSchedule(): Observable<ScheduleDay[]> {
        const placeRef = doc(this.firestore, this.schedulePath);

        return from(getDoc(placeRef)).pipe(
            map(snap => {
                const data = snap.data() as any;
                const scheduleData = data?.schedule ?? this.getDefaultSchedule();

                // Convertir DTOs a entidades del domain
                return scheduleData.map((dayDTO: ScheduleDayDTO) => ScheduleDay.fromDTO(dayDTO));
            }),
            catchError(err => {
                console.error('Error getting schedule:', err);
                return of(this.getDefaultSchedule().map(dto => ScheduleDay.fromDTO(dto)));
            })
        );
    }

    updateSchedule(schedule: ScheduleDay[]): Promise<void> {
        const docRef = doc(this.firestore, this.schedulePath);

        // Convertir las entidades del domain a DTOs planos para Firebase
        const scheduleDTOs = schedule.map(day => day.toDTO());
        return runInInjectionContext(this.injector, async () => {
            await updateDoc(docRef, { schedule: scheduleDTOs });
        });
    }

    // ============= EXCEPTIONS =============

    getExceptions(): Observable<ExceptionItem[]> {
        const collectionRef = collection(this.firestore, this.exceptionsPath);

        return from(getDocs(collectionRef)).pipe(
            map(snap =>
            snap.docs.map(docSnap => {
                const data = docSnap.data() as ExceptionItemDTO;
                return ExceptionItem.fromDTO({ id: docSnap.id, ...data });
            })
        ),
        catchError(err => {
            console.error('Error getting exceptions:', err);
            return of([]);
        })
    );
    }

    addException(exception: ExceptionItem): Promise<void> {
        const collectionRef = collection(this.firestore, this.exceptionsPath);
        const exceptionDTO = exception.toDTO();
        return runInInjectionContext(this.injector, async () => {
            await addDoc(collectionRef, exceptionDTO);
        });
    }

    updateException(id: string, exception: ExceptionItem): Promise<void> {
        const docRef = doc(this.firestore, `${this.exceptionsPath}/${id}`);
        const exceptionDTO = { ...exception.toDTO() };  // spread operator
        return runInInjectionContext(this.injector, async () => {
            await updateDoc(docRef, exceptionDTO);
        });
    }

    deleteException(id: string): Promise<void> {
        const docRef = doc(this.firestore, `${this.exceptionsPath}/${id}`);
        return runInInjectionContext(this.injector, async () => {
            await deleteDoc(docRef);
        });
    }
    // ============= SLOTS =============}
    getSlots(): Observable<ReservedSlot[]> {
        const collectionRef = collection(this.firestore, this.slotsPath);
        
        return from(getDocs(collectionRef)).pipe(
            map(snap =>
                snap.docs.map(docSnap => {
                    const data = docSnap.data() as ReservedSlotDTO;
                    return ReservedSlot.fromDTO({ id: docSnap.id, ...data });
                })
            ),
            catchError(err => {
                console.error('Error getting slots:', err);
                return of([]);
            })
        );
    }

    addSlot(slot: ReservedSlot): Promise<void> {
        const collectionRef = collection(this.firestore, this.slotsPath);
        const slotDTO = slot.toDTO();
        return runInInjectionContext(this.injector, async () => {
            await addDoc(collectionRef, slotDTO);
        });
    }

    deleteSlot(id: string): Promise<void> {
        const docRef = doc(this.firestore, `${this.slotsPath}/${id}`);
        return runInInjectionContext(this.injector, async () => {
            await deleteDoc(docRef);
        });
    }

    // ============= COMPUTED DATA =============
    getAvailableSlots(date: Date, serviceDuration: number): Observable<string[]> {
        throw new Error("Method not implemented.");
    }
}