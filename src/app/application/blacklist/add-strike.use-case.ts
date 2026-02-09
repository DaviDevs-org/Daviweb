import { Injectable, inject } from '@angular/core';
import { BlacklistRepository } from './blacklist.repository.interface';

@Injectable({ providedIn: 'root' })
export class AddStrikeUseCase {
  private repo = inject(BlacklistRepository);

  execute(phone: string, reason?: string, appointmentId?: string, appointmentDate?: Date): Promise<void> {
    return this.repo.addStrike(phone, reason, appointmentId, appointmentDate);
  }
}
