import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BlacklistRepository } from './blacklist.repository.interface';
import { BlacklistEntry } from '@domain/blacklist/blacklist-entry.entity';

@Injectable({ providedIn: 'root' })
export class GetBlacklistUseCase {
  private repo = inject(BlacklistRepository);

  execute(): Observable<BlacklistEntry[]> {
    return this.repo.getBlacklist();
  }
}
