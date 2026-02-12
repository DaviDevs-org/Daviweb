import { Injectable, inject } from '@angular/core';
import { BlacklistRepository } from './blacklist.repository.interface';

@Injectable({ providedIn: 'root' })
export class BlockNumberUseCase {
  private repo = inject(BlacklistRepository);

  execute(phone: string, reason?: string, alias?: string): Promise<void> {
    return this.repo.blockNumber(phone, reason, alias);
  }
}
