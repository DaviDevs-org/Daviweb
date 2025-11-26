import { Injectable } from "@angular/core";
import { ScheduleRepository } from "@application/business";

@Injectable({
    providedIn: "root",
})
export class DeleteSlotUseCase {
    constructor(private readonly scheduleRepository: ScheduleRepository) {}

    async execute(id: string): Promise<void> {
        return this.scheduleRepository.deleteSlot(id);
        }
}