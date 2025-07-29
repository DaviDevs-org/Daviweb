import { Component, EventEmitter, Input, Output } from '@angular/core';
import {CommonModule, NgForOf} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import {MatCard} from "@angular/material/card";


@Component({
  selector: 'app-calendar-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    FormsModule,
    ReactiveFormsModule,
    MatCard
  ],
  templateUrl: './calendar-selector.component.html',
  styleUrls: ['./calendar-selector.component.scss']
})

export class CalendarSelectorComponent {
  selectedDate: Date | null = null;

  @Output() dateSelected = new EventEmitter<Date>();

  onDateChange(date: Date) {
    this.dateSelected.emit(date);
  }
}
