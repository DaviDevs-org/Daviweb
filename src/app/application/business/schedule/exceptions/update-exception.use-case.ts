import { Injectable } from "@angular/core";
import { ScheduleRepository } from "@application/business";
import { ExceptionItem } from "@domain/index";

@Injectable({
    providedIn: "root"
})
export class UpdateExceptionUseCase {
    constructor(private readonly scheduleRepository: ScheduleRepository) {}

    async execute(id:string, exception: ExceptionItem): Promise<void> {
        return this.scheduleRepository.updateException(id, exception);
    }
}
