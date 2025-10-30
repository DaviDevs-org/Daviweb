import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, deleteDoc, doc, updateDoc, getDocs } from '@angular/fire/firestore';
import { Service, ServiceDTO } from '../../admin-panel/types/admin.types';
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
    let segments = data.timeSegments || [];

    if (data.requiresHairLength) {
      const hl = data.hairLengthModifiers || {
        short: { time: 30 },
        medium: { time: 45 },
        long: { time: 60 }
      };
      // Creamos un único segmento que tenga la duración máxima de hairLength (solo para mostrar y calcular slots)
      segments = [{ duration: Math.max(hl.short.time, hl.medium.time, hl.long.time), breakAfter: 0 }];
    }

    return new Service(
      data.name,
      data.description,
      segments,
      data.requiresHairLength || false,
      data.hairLengthModifiers || { short: { time: 30 }, medium: { time: 45 }, long: { time: 60 } },
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
      return deleteDoc(placeRef);
    });
  }

  updateService(id: string, s: Service) {
    return runInInjectionContext(this.injector, () => {
      const placeRef = doc(this.firestore, `${this.path}/${id}`);
      return updateDoc(placeRef, s.toJson() as any);
    });
  }
}
