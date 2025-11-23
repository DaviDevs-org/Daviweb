import { Injectable } from '@angular/core';
import { ServiceRepository } from './service.repository.interface';

@Injectable({
    providedIn: 'root'
})
export class DeleteServiceUseCase {
    constructor(private serviceRepository: ServiceRepository) { }

    execute(id: string): Promise<void> {
        return this.serviceRepository.deleteService(id);
    }
}