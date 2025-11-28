import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Service } from '@domain/services';
import { ServiceRepository } from './service.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class GetServicesUseCase {
  constructor(private serviceRepository: ServiceRepository) { }

  execute(): Observable<Service[]> {
    const dto = this.serviceRepository.getServices();
    return dto.pipe(
      map(serviceDTOs => serviceDTOs.map(dto => Service.fromDTO(dto)))
    );
  }
}
