export class TimeUtils {
  static timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  static hoursRangeFromOpenClose(open: string, close: string, step = 30): string[] {
    if (!open || !close) return [];
    const result: string[] = [];
    const [openH, openM] = open.split(':').map(Number);
    const [closeH, closeM] = close.split(':').map(Number);

    let hour = openH;
    let minute = openM;
    
    // Convertir todo a minutos para facilitar la comparación
    const endMinutes = closeH * 60 + closeM;
    
    while (true) {
      const currentMinutes = hour * 60 + minute;
      if (currentMinutes >= endMinutes) break;
      
      result.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      
      minute += step;
      if (minute >= 60) {
        minute = 0;
        hour++;
      }
    }

    return result;
  }

  static toISODate(d: Date): string {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
}
