import { Injectable, inject } from '@angular/core';
import { BlacklistRepository } from './blacklist.repository.interface';

@Injectable({ providedIn: 'root' })
export class UnblockNumberUseCase {
  private repo = inject(BlacklistRepository);

  execute(phone: string): Promise<void> {
    return this.repo.unblockNumber(phone);
  }
}
