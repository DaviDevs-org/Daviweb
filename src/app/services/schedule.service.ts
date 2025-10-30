import { Injectable } from "@angular/core";
import { ScheduleDay } from '../admin-panel/types/admin.types';

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {

  // Formatea un schedule mostrando todos los intervalos de cada día
  formatScheduleText(schedule: ScheduleDay[]): string {
    if (!schedule || schedule.length === 0) return '';

    const groups: { days: string[], schedule: string }[] = [];

    for (const day of schedule) {
      const scheduleText = day.closed
        ? 'Cerrado'
        : day.intervals
            .map(interval => `${interval.open}\u00A0-\u00A0${interval.close}`) // no cortar alrededor del guion
            .join('\u00A0\u00B7\u00A0'); // separador «·» con no-break spaces

      const existingGroup = groups.find(group => group.schedule === scheduleText);

      if (existingGroup) {
        existingGroup.days.push(day.name);
      } else {
        groups.push({ days: [day.name], schedule: scheduleText });
      }
    }

    // Formatear cada grupo
    const formattedGroups = groups.map(group => {
      let dayText: string;

      if (group.days.length === 1) {
        dayText = group.days[0];
      } else if (group.days.length === 2) {
        dayText = group.days.join(' y ');
      } else {
        const firstDay = group.days[0];
        const lastDay = group.days[group.days.length - 1];

        const dayOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const isConsecutive = group.days.every((day, index) => {
          if (index === 0) return true;
          const currentIndex = dayOrder.indexOf(day);
          const prevIndex = dayOrder.indexOf(group.days[index - 1]);
          return currentIndex === prevIndex + 1;
        });

        dayText = isConsecutive && group.days.length > 2
          ? `${firstDay} a ${lastDay}`
          : `${group.days.slice(0, -1).join(', ')} y ${lastDay}`;
      }

      return `${dayText}: ${group.schedule}`;
    });

    return formattedGroups.join(' ');
  }

  // Formato simple: no agrupa días, muestra todos los intervalos
  formatScheduleTextSimple(schedule: ScheduleDay[]): string {
    if (!schedule || schedule.length === 0) return '';

    return schedule.map(day => {
      const scheduleText = day.closed
        ? 'Cerrado'
        : day.intervals
            .map(interval => `${interval.open}\u00A0-\u00A0${interval.close}`)
            .join('\u00A0\u00B7\u00A0');
      return `${day.name}: ${scheduleText}`;
    }).join(' ');
  }

  // Función para dividir texto de schedule en partes
  splitScheduleText(scheduleText: string): string[] {
    if (!scheduleText || scheduleText.trim() === '') return [];

    const parts = scheduleText.split(' ');
    const result: string[] = [];
    let currentPart = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (currentPart === '') currentPart = part;
      else currentPart += ' ' + part;

      if (part.includes(':') && i + 1 < parts.length) {
        const nextPart = parts[i + 1];
        currentPart += ' ' + nextPart;
        result.push(currentPart);
        currentPart = '';
        i++;
      }
    }

    if (currentPart) result.push(currentPart);
    return result;
  }
}
