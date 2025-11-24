import { Observable } from 'rxjs';
import { Service, ServiceDTO } from '@domain/services';

export abstract class ServiceRepository {
  abstract getServices(): Observable<ServiceDTO[]>;
  abstract addService(service: Service): Observable<string>;
  abstract updateService(id: string, service: Service): Observable<void>;
  abstract deleteService(id: string): Observable<void>;
}
