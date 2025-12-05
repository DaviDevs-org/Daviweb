// admin-panel.component.ts (Refactorizado)
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminHeaderComponent } from './components/admin-header/admin-header.component';
import { AdminNavComponent, AdminTab } from './components/admin-nav/admin-nav.component';
import { GalleryManagementComponent } from './components/gallery-management/gallery-management.component';
import { ServicesManagementComponent } from './components/services-management/services-management.component';
import { InfoManagementComponent } from './components/info-management/info-management.component';
import { AuthenticationService } from '../shared/authentication.service';
import { AppointmentManagementComponent } from './components/appointment-management/appointment-management.component';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    AdminHeaderComponent,
    AdminNavComponent,
    GalleryManagementComponent,
    ServicesManagementComponent,
    InfoManagementComponent,
    AppointmentManagementComponent
  ],
  templateUrl: "./admin-panel.component.html",
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent {
  private auth = inject(AuthenticationService)
  activeTab: AdminTab = 'gallery';

  onTabChange(tab: AdminTab): void {
    this.activeTab = tab;
  }

  onLogout(): void {
    this.auth.logOut()
  }
}
