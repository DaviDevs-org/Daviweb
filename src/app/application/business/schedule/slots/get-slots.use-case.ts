import { Injectable } from "@angular/core";
import { ScheduleRepository } from "@application/business";
import { ReservedSlot } from "@domain/index";
import { Observable } from "rxjs";

@Injectable({
    providedIn: "root",
})
export class GetSlotsUseCase {
    constructor(private readonly scheduleRepository: ScheduleRepository) {}

    execute(): Observable<ReservedSlot[]> {
        return this.scheduleRepository.getSlots();
        }
}