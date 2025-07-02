// src/app/components/header/header.component.ts
import { Component, OnInit } from '@angular/core';
import { IconClock, IconMapPin, IconPhone } from 'lucide-angular';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit {
  isOpen: boolean;
  nextOpenText: string;

  ngOnInit() {
    this.checkOpenStatus();
  }

  private checkOpenStatus() {
    const now = new Date();
    const day = now.getDay(); // 0 Sunday, 1 Monday, …
    const hour = now.getHours();
    let open = false;
    if (day === 0) {
      open = false;
      this.nextOpenText = this.getNextOpeningTime();
    } else if (day === 6) {
      open = hour >= 9 && hour < 18;
      if (!open) this.nextOpenText = this.getNextOpeningTime();
    } else {
      open = hour >= 10 && hour < 20;
      if (!open) this.nextOpenText = this.getNextOpeningTime();
    }
    this.isOpen = open;
  }

  private getNextOpeningTime(): string {
    const now = new Date();
    let next = new Date(now);
    const day = now.getDay();
    const hour = now.getHours();
    // If Sunday → next is Monday at 10:00
    if (day === 0) {
      next.setDate(now.getDate() + 1);
      next.setHours(10, 0, 0, 0);
      return `Reabrimos el ${this.formatDate(next)} a las ${this.formatHour(next)}`;
    }
    // Saturday after 18:00 → next Monday at 10:00
    if (day === 6 && hour >= 18) {
      next.setDate(now.getDate() + 2);
      next.setHours(10, 0, 0, 0);
      return `Reabrimos el ${this.formatDate(next)} a las ${this.formatHour(next)}`;
    }
    // Weekday before 10:00 → hoy a las 10:00
    if (day >= 1 && day <= 5 && hour < 10) {
      next.setHours(10, 0, 0, 0);
      return `Reabrimos hoy a las 10:00`;
    }
    // Weekday after 20:00 → mañana a las 10:00 (except si mañana domingo)
    if (day >= 1 && day <= 5 && hour >= 20) {
      if (day === 5) {
        // Viernes después de cierre → sábado a las 9:00
        next.setDate(now.getDate() + 1);
        next.setHours(9, 0, 0, 0);
        return `Reabrimos el ${this.formatDate(next)} a las 9:00`;
      } else {
        next.setDate(now.getDate() + 1);
        next.setHours(10, 0, 0, 0);
        return `Reabrimos mañana a las 10:00`;
      }
    }
    // Sábado antes de 9:00 → hoy a las 9:00
    if (day === 6 && hour < 9) {
      next.setHours(9, 0, 0, 0);
      return `Reabrimos hoy a las 9:00`;
    }
    return '';
  }

  private formatDate(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private formatHour(d: Date): string {
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mi}`;
  }
}
