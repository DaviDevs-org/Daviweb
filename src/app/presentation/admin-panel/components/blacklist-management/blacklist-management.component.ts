import { Component, inject, computed, signal, effect } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GetBlacklistUseCase, BlockNumberUseCase, UnblockNumberUseCase, AddStrikeUseCase, GetStrikesUseCase, DeleteStrikeUseCase, UpdateStrikeUseCase, ResetStrikesUseCase } from '@application/blacklist';
import { BlacklistEntry, Strike } from '@domain/blacklist/blacklist-entry.entity';
import { PhoneInputComponent } from '@presentation/shared/components/phone-input/phone-input.component';
import { AlertService } from '@presentation/shared/alert/alert.service';
import { Observable, catchError, of, switchMap, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-blacklist-management',
  standalone: true,
  imports: [CommonModule, FormsModule, PhoneInputComponent],
  templateUrl: './blacklist-management.component.html',
  styleUrls: ['./blacklist-management.component.scss']
})
export class BlacklistManagementComponent {
  private getBlacklistUC = inject(GetBlacklistUseCase);
  private getStrikesUC = inject(GetStrikesUseCase);
  private blockNumberUC = inject(BlockNumberUseCase);
  private unblockNumberUC = inject(UnblockNumberUseCase);
  private addStrikeUC = inject(AddStrikeUseCase);
  private deleteStrikeUC = inject(DeleteStrikeUseCase);
  private updateStrikeUC = inject(UpdateStrikeUseCase);
  private resetStrikesUC = inject(ResetStrikesUseCase);
  
  private alertService = inject(AlertService);

  // Data Sources
  blacklist$ = this.getBlacklistUC.execute().pipe(
      catchError(err => {
          console.error('Error loading blacklist:', err);
          return of([]); 
      })
  );
  blacklist = toSignal(this.blacklist$, { initialValue: [] });
  
  blockedNumbers = computed(() => this.blacklist().filter(e => e.isBlocked));
  strikesList = computed(() => this.blacklist().filter(e => e.strikeCount > 0));

  // Form Inputs
  newPhone = '';
  newReason = '';
  newStrikePhone = '';
  newStrikeReason = '';
  
  // View State
  showAllBlocked = false;
  showAllStrikes = false;
  
  // Modal State
  selectedPhone = signal<string | null>(null);
  
  selectedOffender = computed(() => {
      const phone = this.selectedPhone();
      if (!phone) return null;
      return this.blacklist().find(e => e.phone === phone) || null;
  });

  selectedOffenderStrikes$ = toObservable(this.selectedPhone).pipe(
      switchMap(phone => {
          if (!phone) return of<Strike[]>([]);
          return this.getStrikesUC.execute(phone);
      })
  );

  constructor() {
      // Auto-close modal if data disappears (cleanup)
      effect(() => {
          const phone = this.selectedPhone();
          const offender = this.selectedOffender();
          const list = this.blacklist();
          
          if (phone && !offender && list.length > 0) {
              this.closeManageModal();
          }
      }, { allowSignalWrites: true });
  }

  openManageModal(item: BlacklistEntry) {
      this.selectedPhone.set(item.phone);
  }

  closeManageModal() {
      this.selectedPhone.set(null);
  }

  async blockNumber() {
    if (!this.newPhone) return;
    try {
      await this.blockNumberUC.execute(this.newPhone, this.newReason);
      await this.alertService.success(`Número ${this.newPhone} bloqueado.`);
      this.newPhone = '';
      this.newReason = '';
    } catch (error) {
      console.error('Error blocking', error);
      await this.alertService.error('Error al bloquear número.');
    }
  }

  async unblockNumber(phone: string) {
    const confirmed = await this.alertService.confirm(
        '¿Desbloquear número?',
        `El número ${phone} podrá volver a reservar citas.`
    );
    if (confirmed) {
      try {
        await this.unblockNumberUC.execute(phone);
        await this.alertService.success('Desbloqueado correctamente.');
      } catch (error) {
        console.error('Error unblocking', error);
        await this.alertService.error('Error al desbloquear.');
      }
    }
  }

  async addStrike() {
    if (!this.newStrikePhone) return;
    try {
        await this.addStrikeUC.execute(this.newStrikePhone, this.newStrikeReason);
        await this.alertService.success(`Falta registrada al ${this.newStrikePhone}`);
        this.newStrikePhone = '';
        this.newStrikeReason = '';
    } catch (error) {
        console.error('Error adding strike', error);
        await this.alertService.error('Error al añadir falta.');
    }
  }

  // === Modal Actions ===

  async deleteStrike(strike: Strike) {
      const offender = this.selectedOffender();
      if (!offender || !strike.id) return;
      
      const confirmed = await this.alertService.confirm(
          '¿Eliminar falta?',
          'Esta acción restará 1 al contador de faltas.'
      );

      if (confirmed) {
          try {
              await this.deleteStrikeUC.execute(offender.phone, strike.id);
              await this.alertService.success('Falta eliminada.');
          } catch (error) {
              console.error('Error deleting strike', error);
              await this.alertService.error('No se pudo eliminar la falta.');
          }
      }
  }

  async editStrike(strike: Strike) {
      const offender = this.selectedOffender();
      if (!offender || !strike.id) return;

      const newReason = prompt('Editar motivo:', strike.reason || '');
      if (newReason === null || newReason === strike.reason) return;

      try {
          await this.updateStrikeUC.execute(offender.phone, strike.id, { reason: newReason });
          await this.alertService.success('Motivo actualizado.');
      } catch (error) {
          console.error(error);
          await this.alertService.error('Error al actualizar.');
      }
  }

  async increaseStrikes() {
      const offender = this.selectedOffender();
      if (!offender) return;
      try {
          await this.addStrikeUC.execute(offender.phone, 'Ajuste manual (+)');
      } catch (error) {
          await this.alertService.error('Error al añadir falta.');
      }
  }

  async decreaseStrikes() {
      const offender = this.selectedOffender();
      if (!offender) return;
      
      try {
          // Get latest strike to delete
          const strikes = await firstValueFrom(this.selectedOffenderStrikes$);
          if (!strikes || strikes.length === 0) return;
          
          const latestStrike = strikes[0];
          await this.deleteStrikeUC.execute(offender.phone, latestStrike.id!);
      } catch (error) {
          await this.alertService.error('No se puede reducir más.');
      }
  }

  async clearAllStrikes() {
      const offender = this.selectedOffender();
      if (!offender) return;

      const confirmed = await this.alertService.confirm(
          '¿Reiniciar contador?',
          'Se eliminarán TODAS las faltas registradas de este usuario.'
      );

      if (confirmed) {
          try {
              await this.resetStrikesUC.execute(offender.phone);
              await this.alertService.success('Contador reiniciado.');
              this.closeManageModal();
          } catch (error) {
              await this.alertService.error('Error al reiniciar.');
          }
      }
  }
}
