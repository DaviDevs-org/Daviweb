// admin-header.component.ts
import { Component, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '../../../shared/authentication.service';
import { AlertService } from '../../../shared/alert/alert.service';
import { SaasConfigService } from 'src/app/config/saas-config.service';

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
  public saasConfig = inject(SaasConfigService).getAll().business;

  async onLogout() {
    if (await this.toast.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      this.auth.logOut()
    }
  }
}
