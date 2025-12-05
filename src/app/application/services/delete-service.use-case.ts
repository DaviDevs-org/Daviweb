import { Injectable } from '@angular/core';
import { ServiceRepository } from './service.repository.interface';
import { Observable, from } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class DeleteServiceUseCase {
    constructor(private serviceRepository: ServiceRepository) { }

    execute(id: string): Observable<void> {
        return from(this.serviceRepository.deleteService(id));
    }
}