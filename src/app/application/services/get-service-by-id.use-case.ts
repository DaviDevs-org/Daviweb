import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Service } from '@domain/services/service.entity';
import { ServiceRepository } from './service.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class GetServiceByIdUseCase {
  constructor(private serviceRepository: ServiceRepository) {}

  execute(id: string): Observable<Service | null> {
    return this.serviceRepository.getServiceById(id);
  }
}
