import { Observable } from 'rxjs';
import { BlacklistEntry, Strike } from '@domain/blacklist/blacklist-entry.entity';

export abstract class BlacklistRepository {
    abstract getBlacklist(): Observable<BlacklistEntry[]>;
    abstract getStrikes(phone: string): Observable<Strike[]>;
    abstract blockNumber(phone: string, reason?: string, alias?: string): Promise<void>;
    abstract unblockNumber(phone: string): Promise<void>;
    abstract addStrike(phone: string, reason?: string, appointmentId?: string, appointmentDate?: Date): Promise<void>;
    abstract deleteStrike(phone: string, strikeId: string): Promise<void>;
    abstract updateStrike(phone: string, strikeId: string, data: Partial<Strike>): Promise<void>;
    abstract resetStrikes(phone: string): Promise<void>;
    abstract updateEntry(phone: string, data: Partial<BlacklistEntry>): Promise<void>;
    abstract isBlocked(phone: string): Promise<boolean>;
}
