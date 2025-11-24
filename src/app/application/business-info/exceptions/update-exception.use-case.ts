import { Injectable } from "@angular/core";
import { BusinessInfoRepository } from "../business-info.repository.interface";
import { ExceptionItem } from "@domain/index";

@Injectable({
    providedIn: "root"
})
export class UpdateExceptionUseCase {
    constructor(private readonly businessInfoRepository: BusinessInfoRepository) {}

    async execute(id:string, exception: ExceptionItem): Promise<void> {
        return this.businessInfoRepository.updateException(id, exception);
    }
}
