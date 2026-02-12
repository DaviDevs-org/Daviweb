import { Injectable, inject } from '@angular/core';
import { BlacklistRepository } from './blacklist.repository.interface';

@Injectable({ providedIn: 'root' })
export class IsBlockedUseCase {
  private repo = inject(BlacklistRepository);

  execute(phone: string): Promise<boolean> {
    return this.repo.isBlocked(phone);
  }
}
