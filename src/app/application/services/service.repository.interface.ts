import { Observable } from 'rxjs';
import { Service, ServiceDTO } from '@domain/services';

export abstract class ServiceRepository {
  abstract getServices(): Observable<ServiceDTO[]>;
  abstract addService(service: Service): Promise<string>;
  abstract updateService(id: string, service: Service): Promise<void>;
  abstract deleteService(id: string): Promise<void>;
}
