import { inject, Injectable, Injector, runInInjectionContext, Inject, PLATFORM_ID } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  limit
} from '@angular/fire/firestore';
import { Service } from '../../admin-panel/types/admin.types';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ServiceManager {
  private firestore = inject(Firestore);
  private injector = inject(Injector);
  private path = '/pruebas/data/services';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  getServices(): Observable<Service[]> {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, this.path);
      // SSR: limitar solo a los primeros 8 servicios como ejemplo
      const q = isPlatformBrowser(this.platformId)
        ? ref
        : query(ref, limit(8));
      return collectionData(q, { idField: 'id' }) as Observable<Service[]>;
    });
  }

  async getServicesDirectly(limitCount?: number): Promise<Service[]> {
    return runInInjectionContext(this.injector, async () => {
      const ref = collection(this.firestore, this.path);
      // En SSR, usa limitCount si lo pasas; en cliente, tráelos todos
      if (!isPlatformBrowser(this.platformId) && limitCount !== undefined) {
        const limitedQuery = query(ref, limit(limitCount));
        const snapshot = await getDocs(limitedQuery);
        return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Service[];
      } else {
        const snapshot = await getDocs(ref);
        return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Service[];
      }
    });
  }


  addService(s: Service) {
    return runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, this.path);
      return addDoc(ref, s.toJson());
    });
  }

  deleteService(id: string) {
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, `${this.path}/${id}`);
      return deleteDoc(ref);
    });
  }

  updateService(id: string, s: Service) {
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, `${this.path}/${id}`);
      return updateDoc(ref, s.toJson());
    });
  }


}
