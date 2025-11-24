import { Injectable } from "@angular/core";
import { ServiceRepository } from "./service.repository.interface";
import { Service } from "@domain/services";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class CreateServiceUseCase {
    constructor(private serviceRepository: ServiceRepository) { }

    execute(service: Service): Observable<string> {
        return this.serviceRepository.addService(service);
    }
}