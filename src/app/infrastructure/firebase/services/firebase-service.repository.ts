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

    addService(service: Service): Promise<string> {
        return runInInjectionContext(this.injector, () => {
            const servicesRef = collection(this.firestore, this.path);
            return addDoc(servicesRef, service.toDTO()).then(docRef => docRef.id).catch(error => {
                return Promise.reject(error);
            });
        });
    }

    updateService(id: string, service: Service): Promise<void> {
        return runInInjectionContext(this.injector, () => {
            const serviceRef = doc(this.firestore, `${this.path}/${id}`);
            return updateDoc(serviceRef, { ...service.toDTO() }).catch(error => {
                return Promise.reject(error);
            });
        });
    }

    deleteService(serviceId: string): Promise<void> {
        return runInInjectionContext(this.injector, () => {
            const serviceRef = doc(this.firestore, `${this.path}/${serviceId}`);
            return deleteDoc(serviceRef).catch(error => {
                return Promise.reject(error);
            });
        });
    }
}