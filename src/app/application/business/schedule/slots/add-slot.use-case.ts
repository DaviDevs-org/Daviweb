import { Injectable } from "@angular/core";
import { ScheduleRepository } from "@application/business";
import { ReservedSlot } from "@domain/index";

@Injectable({
    providedIn: "root",
})
export class AddSlotUseCase {
    constructor(private readonly scheduleRepository: ScheduleRepository) {}

    async execute(slot: ReservedSlot): Promise<void> {
        return this.scheduleRepository.addSlot(slot);
        }
}