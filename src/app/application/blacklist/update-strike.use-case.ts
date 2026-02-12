import { Injectable, inject } from '@angular/core';
import { BlacklistRepository } from './blacklist.repository.interface';
import { Strike } from '@domain/blacklist/blacklist-entry.entity';

@Injectable({ providedIn: 'root' })
export class UpdateStrikeUseCase {
  private repo = inject(BlacklistRepository);

  execute(phone: string, strikeId: string, data: Partial<Strike>): Promise<void> {
    return this.repo.updateStrike(phone, strikeId, data);
  }
}
