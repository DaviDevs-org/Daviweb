import { Injectable } from "@angular/core";
import { ServiceRepository } from "./service.repository.interface";
import { Service } from "@domain/services";

@Injectable({
    providedIn: 'root'
})
export class CreateServiceUseCase {
    constructor(private serviceRepository: ServiceRepository) { }

    execute(service: Service): Promise<void> {
        return this.serviceRepository.addService(service);
    }
}