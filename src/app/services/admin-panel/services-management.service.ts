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
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ServiceManager {
  private firestore = inject(Firestore);
  private injector = inject(Injector);
  private path = '/pruebas/data/services';

  getServices(): Observable<Service[]> {
    return runInInjectionContext(this.injector, () => {
      const placeRef = collection(this.firestore, this.path);
      return collectionData(placeRef, { idField: 'id' }) as Observable<Service[]>;
    });
  }

  async getServicesDirectly(): Promise<Service[]> {
    return runInInjectionContext(this.injector, async () => {
      const placeRef = collection(this.firestore, this.path);
      const snapshot = await getDocs(placeRef);
      return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Service[];
    });
  }

  addService(s: Service) {
    return runInInjectionContext(this.injector, () => {
      const placeRef = collection(this.firestore, this.path);
      return addDoc(placeRef, s.toJson());
    });
  }

  deleteService(id: string) {
    return runInInjectionContext(this.injector, () => {
      const placeRef = doc(this.firestore, `${this.path}/${id}`);
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

