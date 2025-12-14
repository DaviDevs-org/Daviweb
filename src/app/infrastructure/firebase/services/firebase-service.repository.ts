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
  Firestore,
  updateDoc,
} from '@angular/fire/firestore';
import { ServiceRepository } from '@application/services';
import { Service, ServiceDTO } from '@domain/services';
import { catchError, Observable, of } from 'rxjs';
import { SaasConfigService } from 'src/app/config/saas-config.service';

@Injectable({
  providedIn: 'root',
})
export class FirebaseServiceRepository implements ServiceRepository {
  private firestore = inject(Firestore);
  private pathConfig = inject(SaasConfigService).getDDBBPaths();
  private injector = inject(Injector);

  // Usamos la ruta definida en la configuración
  private path = this.pathConfig.services;

  getServices(): Observable<ServiceDTO[]> {
    if (!this.firestore) {
      console.error('Firebase Firestore is not initialized!');
      return of([]);
    }
    return runInInjectionContext(this.injector, () => {
      const placeRef = collection(this.firestore, this.path);
      return (
        collectionData(placeRef, { idField: 'id' }) as Observable<ServiceDTO[]>
      ).pipe(
        catchError((err) => {
          if (err.code === 'permission-denied') {
            console.warn(
              'Permisos insuficientes para leer servicios. Usando lista vacía.'
            );
          } else {
            console.error('Error getting services:', err);
          }
          return of([]);
        })
      );
    });
  }

  async addService(service: Service): Promise<string> {
    return runInInjectionContext(this.injector, async () => {
      const servicesRef = collection(this.firestore, this.path);
      const docRef = await addDoc(servicesRef, service.toDTO());
      return docRef.id;
    });
  }

  async updateService(id: string, service: Service): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const serviceRef = doc(this.firestore, `${this.path}/${id}`);
      await updateDoc(serviceRef, { ...service.toDTO() });
    });
  }

  async deleteService(serviceId: string): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const serviceRef = doc(this.firestore, `${this.path}/${serviceId}`);
      await deleteDoc(serviceRef);
    });
  }
}
