import { Injectable, inject } from '@angular/core';
import { AttendanceRepository } from './attendance.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class AddStrikeUseCase {
  private repo = inject(AttendanceRepository);

  execute(phone: string, reason: string): Promise<void> {
    // Aquí podríamos añadir validaciones de negocio extra
    // Por ejemplo, no permitir más de X faltas al día, etc.
    return this.repo.addStrike(phone, reason);
  }
}
