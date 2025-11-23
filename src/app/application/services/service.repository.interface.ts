import { Observable } from 'rxjs';
import { Service } from '@domain/services';

export abstract class ServiceRepository {
  abstract getServices(): Observable<Service[]>;
  abstract getServiceById(id: string): Observable<Service | null>;
  abstract addService(service: Service): Promise<void>;
  abstract updateService(id: string, service: Service): Promise<void>;
  abstract deleteService(id: string): Promise<void>;
}
