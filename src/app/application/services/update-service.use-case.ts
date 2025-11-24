import { Injectable } from "@angular/core";
import { ServiceRepository } from "./service.repository.interface";
import { Service } from "@domain/services";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class UpdateServiceUseCase {
    constructor(private serviceRepository: ServiceRepository) { }

    execute(id: string, service: Service): Observable<void> {
        return this.serviceRepository.updateService(id, service);
    }
}