import { Observable } from 'rxjs';
import { BlockedNumber } from '@domain/blacklist/blocked-number.entity';

export abstract class BlockedNumberRepository {
  // Queries
  abstract isBlocked(phone: string): Promise<boolean>;
  abstract getBlockedNumbers(): Observable<BlockedNumber[]>;

  // Commands
  abstract blockNumber(phone: string, reason: string): Promise<void>;
  abstract unblockNumber(phone: string): Promise<void>;
}
