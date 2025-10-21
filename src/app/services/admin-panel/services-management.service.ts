import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDocs
} from '@angular/fire/firestore';
import { Service } from '../../admin-panel/types/admin.types';
import { Storage, ref, deleteObject } from '@angular/fire/storage';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ServiceManager {
  private firestore = inject(Firestore);
  private injector = inject(Injector);
  private path = '/pruebas/data/services';
  private storage = inject(Storage);

  getServices(): Observable<Service[]> {
    return runInInjectionContext(this.injector, () => {
      const placeRef = collection(this.firestore, this.path);
      return (collectionData(placeRef, { idField: 'id' }) as Observable<any[]>).pipe(
        map(services => services.map(s => this.mapToServiceInstance(s)))
      );
    });
  }

  async getServicesDirectly(): Promise<Service[]> {
    return runInInjectionContext(this.injector, async () => {
      const placeRef = collection(this.firestore, this.path);
      const snapshot = await getDocs(placeRef);
      return snapshot.docs.map(d => {
        const data = { id: d.id, ...(d.data() as any) };
        return this.mapToServiceInstance(data);
      });
    });
  }

  private mapToServiceInstance(data: any): Service {
    return new Service(
      data.name,
      data.description,
      data.timeSegments || [],
      data.price,
      data.imageUrl,
      data.id
    );
  }

  addService(s: Service) {
    return runInInjectionContext(this.injector, () => {
      const placeRef = collection(this.firestore, this.path);
      return addDoc(placeRef, s.toJson());
    });
  }

  async deleteService(id: string) {
    return runInInjectionContext(this.injector, async () => {
      const placeRef = doc(this.firestore, `${this.path}/${id}`);
      // Leer el documento para obtener la imageUrl y borrar la imagen
      try {
        const { getDoc } = await import('@angular/fire/firestore');
        const snap = await getDoc(placeRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          const imageUrl: string | undefined = data?.imageUrl;
          if (imageUrl) {
            try {
              const r = ref(this.storage, imageUrl);
              await deleteObject(r);
            } catch (e) {
              console.warn('No se pudo borrar la imagen del servicio o no existe:', e);
            }
          }
        }
      } catch (e) {
        console.warn('No se pudo obtener el servicio antes de borrar para limpiar imagen:', e);
      }
      // Borrar el documento del servicio
      return deleteDoc(placeRef);
    });
  }

  updateService(id: string, s: Service) {
    return runInInjectionContext(this.injector, () => {
      const placeRef = doc(this.firestore, `${this.path}/${id}`);
      return updateDoc(placeRef, s.toJson());
    });
  }
}

