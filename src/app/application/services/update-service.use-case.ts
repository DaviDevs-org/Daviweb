import { Injectable } from "@angular/core";
import { ServiceRepository } from "./service.repository.interface";
import { Service } from "@domain/services";

@Injectable({
    providedIn: 'root'
})
export class UpdateServiceUseCase {
    constructor(private serviceRepository: ServiceRepository) { }

    execute(id: string, service: Service): Promise<void> {
        return this.serviceRepository.updateService(id, service);
    }
}