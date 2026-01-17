import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlockedNumberRepository } from '@application/blacklist/blocked-number.repository.interface';
import { PhoneInputComponent } from '@presentation/shared/components/phone-input/phone-input.component';
import { AlertService } from '@presentation/shared/alert/alert.service';

@Component({
  selector: 'app-blacklist-management',
  standalone: true,
  imports: [CommonModule, FormsModule, PhoneInputComponent],
  templateUrl: './blacklist-management.component.html',
  styleUrls: ['./blacklist-management.component.scss']
})
export class BlacklistManagementComponent {
  private repo = inject(BlockedNumberRepository);
  private alertService = inject(AlertService);

  blockedNumbers$ = this.repo.getBlockedNumbers();

  newPhone = '';
  newReason = '';

  async blockNumber() {
    if (!this.newPhone) return;
    try {
      await this.repo.blockNumber(this.newPhone, this.newReason);
      
      await this.alertService.success(
          `El número ${this.newPhone} ha sido añadido a la lista negra.`
      );

      this.newPhone = '';
      this.newReason = '';
    } catch (error) {
      console.error('Error blocking number', error);
      await this.alertService.error(
          'No se pudo bloquear el número. Inténtalo de nuevo.'
      );
    }
  }

  async unblockNumber(phone: string) {
    const confirmed = await this.alertService.confirm(
        `¿Estás seguro de que quieres desbloquear ${phone} y permitirle reservar de nuevo?`,
        'Sí, desbloquear',
        'Cancelar'
    );

    if (confirmed) {
      try {
        await this.repo.unblockNumber(phone);
        await this.alertService.success(
            'El número ya puede realizar reservas.'
        );
      } catch (error) {
        console.error('Error unblocking', error);
        await this.alertService.error(
            'No se pudo desbloquear el número.'
        );
      }
    }
  }
}
