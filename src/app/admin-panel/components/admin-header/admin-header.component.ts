import { Component, EventEmitter, inject, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '../../../services/authentication.service';
import { AlertService } from '../../../services/alert/alert.service';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl:'./admin-header.component.html',
  styleUrls: ['./admin-header.component.scss']
})
export class AdminHeaderComponent {
  private auth = inject(AuthenticationService)
  private toast = inject(AlertService)

  @Output() logout = new EventEmitter<void>();  // <-- AQUÍ

  async onLogout() {
    if (await this.toast.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      this.logout.emit();         // <-- EMITIR EVENTO PARA EL PADRE
      this.auth.logOut();
    }
  }
}
