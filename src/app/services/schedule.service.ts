import { Injectable } from "@angular/core";
import { ScheduleDay } from "./admin-panel/info-management.service";

@Injectable({
    providedIn:'root'
})
export class ScheduleService{
    formatScheduleText(schedule: ScheduleDay[]): string {
        if (!schedule || schedule.length === 0) {
            return '';
        }

        // Agrupar días consecutivos con el mismo horario
        const groups: { days: string[], schedule: string }[] = [];
        
        for (const day of schedule) {
            const scheduleText = day.closed ? 'Cerrado' : `${day.open}-${day.close}`;
            
            // Buscar si ya existe un grupo con el mismo horario
            const existingGroup = groups.find(group => group.schedule === scheduleText);
            
            if (existingGroup) {
                existingGroup.days.push(day.name);
            } else {
                groups.push({
                    days: [day.name],
                    schedule: scheduleText
                });
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
                // Para rangos de días consecutivos
                const firstDay = group.days[0];
                const lastDay = group.days[group.days.length - 1];
                
                // Verificar si son días consecutivos
                const dayOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                const isConsecutive = group.days.every((day, index) => {
                    if (index === 0) return true;
                    const currentIndex = dayOrder.indexOf(day);
                    const prevIndex = dayOrder.indexOf(group.days[index - 1]);
                    return currentIndex === prevIndex + 1;
                });
                
                if (isConsecutive && group.days.length > 2) {
                    dayText = `${firstDay} a ${lastDay}`;
                } else {
                    // Si no son consecutivos, separarlos con comas
                    const allButLast = group.days.slice(0, -1);
                    dayText = `${allButLast.join(', ')} y ${lastDay}`;
                }
            }
            
            return `${dayText}: ${group.schedule}`;
        });
        
        return formattedGroups.join(' ');
    }

    // Función alternativa más simple que no agrupa días
    formatScheduleTextSimple(schedule: ScheduleDay[]): string {
        if (!schedule || schedule.length === 0) {
            return '';
        }
        
        return schedule.map(day => {
            const scheduleText = day.closed ? 'Cerrado' : `${day.open}-${day.close}`;
            return `${day.name}: ${scheduleText}`;
        }).join(' ');
    }

    splitScheduleText(scheduleText: string): string[] {
        if (!scheduleText || scheduleText.trim() === '') {
            return [];
        }
        
        // Dividir por espacios y reagrupar los elementos que van juntos
        const parts = scheduleText.split(' ');
        const result: string[] = [];
        let currentPart = '';
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            if (currentPart === '') {
                currentPart = part;
            } else {
                currentPart += ' ' + part;
            }
            
            // Si la parte actual termina con ":" y la siguiente contiene "-" o es "Cerrado"
            // entonces hemos completado un grupo de horario
            if (part.includes(':') && i + 1 < parts.length) {
                const nextPart = parts[i + 1];
                currentPart += ' ' + nextPart;
                result.push(currentPart);
                currentPart = '';
                i++; // Saltamos el siguiente elemento porque ya lo procesamos
            }
        }
        
        // Si queda algo sin procesar
        if (currentPart) {
            result.push(currentPart);
        }
        
        return result;
    }
}