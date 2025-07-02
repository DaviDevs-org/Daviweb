// src/app/lib/utils.ts
export function isBarberShopOpen(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 Sunday, 1 Monday, …
  const hour = now.getHours();
  if (day === 0) return false;
  if (day === 6) return hour >= 9 && hour < 18;
  return hour >= 10 && hour < 20;
}

export function getNextOpeningTime(): string {
  const now = new Date();
  let next = new Date(now);
  const day = now.getDay();
  const hour = now.getHours();

  if (day === 0) {
    next.setDate(now.getDate() + 1);
    next.setHours(10, 0, 0, 0);
    return `Reabrimos el ${formatDate(next)} a las ${formatHour(next)}`;
  }
  if (day === 6 && hour >= 18) {
    next.setDate(now.getDate() + 2);
    next.setHours(10, 0, 0, 0);
    return `Reabrimos el ${formatDate(next)} a las ${formatHour(next)}`;
  }
  if (day >= 1 && day <= 5 && hour < 10) {
    return `Reabrimos hoy a las 10:00`;
  }
  if (day >= 1 && day <= 5 && hour >= 20) {
    if (day === 5) {
      next.setDate(now.getDate() + 1);
      next.setHours(9, 0, 0, 0);
      return `Reabrimos el ${formatDate(next)} a las 9:00`;
    } else {
      return `Reabrimos mañana a las 10:00`;
    }
  }
  if (day === 6 && hour < 9) {
    return `Reabrimos hoy a las 9:00`;
  }
  return '';
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatHour(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}
