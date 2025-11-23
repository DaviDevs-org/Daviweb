import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Service } from '@domain/services';
import { ServiceRepository } from './service.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class GetAllServicesUseCase {
  constructor(private serviceRepository: ServiceRepository) {}

  execute(): Observable<Service[]> {
    return this.serviceRepository.getServices();
  }
}
