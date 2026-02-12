import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BlacklistRepository } from './blacklist.repository.interface';
import { Strike } from '@domain/blacklist/blacklist-entry.entity';

@Injectable({ providedIn: 'root' })
export class GetStrikesUseCase {
  private repo = inject(BlacklistRepository);

  execute(phone: string): Observable<Strike[]> {
    return this.repo.getStrikes(phone);
  }
}
