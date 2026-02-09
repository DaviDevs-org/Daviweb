import { Injectable, inject } from '@angular/core';
import { BlacklistRepository } from './blacklist.repository.interface';

@Injectable({ providedIn: 'root' })
export class DeleteStrikeUseCase {
  private repo = inject(BlacklistRepository);

  execute(phone: string, strikeId: string): Promise<void> {
    return this.repo.deleteStrike(phone, strikeId);
  }
}
