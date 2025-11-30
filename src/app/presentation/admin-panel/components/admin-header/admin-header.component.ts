// admin-header.component.ts
import { Component, EventEmitter, inject, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '../../../../shared/authentication.service';
import { AlertService } from '../../../../shared/alert/alert.service';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-header.component.html',
  styleUrls: ['./admin-header.component.scss']
})
export class AdminHeaderComponent {
  private auth = inject(AuthenticationService)
  private toast = inject(AlertService)

  async onLogout() {
    if (await this.toast.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      this.auth.logOut()
    }
  }
}
