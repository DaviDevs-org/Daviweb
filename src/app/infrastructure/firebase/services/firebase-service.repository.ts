import { ServiceRepository } from "@application/services";
import { Injectable, Injector, inject, runInInjectionContext } from "@angular/core";
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc } from "@angular/fire/firestore";
import { Service, ServiceDTO } from "@domain/services";
import { Observable, from, map, catchError, throwError } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class FirebaseServiceRepository implements ServiceRepository {
    private firestore = inject(Firestore);
    private injector = inject(Injector);
    private path = '/pruebas/data/services';

    getServices(): Observable<ServiceDTO[]> {
        return runInInjectionContext(this.injector, () => {
            const placeRef = collection(this.firestore, this.path);
            return collectionData(placeRef, { idField: 'id' }) as Observable<ServiceDTO[]>;
        });
    }

    addService(service: Service): Observable<string> {
        return runInInjectionContext(this.injector, () => {
            const servicesRef = collection(this.firestore, this.path);
            return from(addDoc(servicesRef, service.toDTO())).pipe(
                map(docRef => docRef.id),
                catchError(err => {
                    return throwError(() => err);
                })
            );
        });
    }

    updateService(id: string, service: Service): Observable<void> {
        return runInInjectionContext(this.injector, () => {
            const serviceRef = doc(this.firestore, `${this.path}/${id}`);
            return from(updateDoc(serviceRef, { ...service })).pipe(
                catchError(err => {
                    return throwError(() => err);
                })
            );
        });
    }

    deleteService(serviceId: string): Observable<void> {
        return runInInjectionContext(this.injector, () => {
            const serviceRef = doc(this.firestore, `${this.path}/${serviceId}`);
            return from(deleteDoc(serviceRef)).pipe(
                catchError(err => {
                    return throwError(() => err);
                })
            );
        });
    }
}