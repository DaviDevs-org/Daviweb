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

  // Blocked Numbers Variables
  newPhone = '';
  newReason = '';

  // Strikes Variables
  newStrikePhone = '';
  newStrikeReason = '';
  
  // View State
  showAllBlocked = false;
  showAllStrikes = false;
  selectedOffender: any = null; // Should be typed with AttendanceRecord later

  // TODO: Replace with real data from repository
  strikesList = [
      { 
          phone: '+34 611 222 333', 
          count: 5, 
          lastStrike: new Date('2024-01-15'), 
          history: [
              { date: new Date('2024-01-15'), reason: 'No apareció' },
              { date: new Date('2023-12-20'), reason: 'Canceló 5 min antes' }
          ]
      },
      { 
          phone: '+34 644 555 666', 
          count: 3, 
          lastStrike: new Date('2024-02-01'),
          history: [] 
      },
      { 
          phone: '+34 677 888 999', 
          count: 1, 
          lastStrike: new Date('2024-02-10'),
          history: [] 
      }
  ];

  openManageModal(item: any) {
      this.selectedOffender = item;
  }

  closeManageModal() {
      this.selectedOffender = null;
  }

  editStrike(event: any) {
    // Placeholder logic
    console.log('Edit strike', event);
  }

  deleteStrike(event: any) {
    // Placeholder logic
    console.log('Delete strike', event);
  }

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

  async addStrike() {
    if (!this.newStrikePhone) return;
    // Placeholder for future logic
    await this.alertService.success(
        `Falta añadida al número ${this.newStrikePhone} (Simulación)`
    );
    this.newStrikePhone = '';
    this.newStrikeReason = '';
  }
}
