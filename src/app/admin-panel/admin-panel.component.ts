// admin-panel.component.ts (Refactorizado)
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminHeaderComponent } from './components/admin-header/admin-header.component';
import { AdminNavComponent, AdminTab } from './components/admin-nav/admin-nav.component';
import { GalleryManagementComponent } from './components/gallery-management/gallery-management.component';
import { ServicesManagementComponent } from './components/services-management/services-management.component';
import { InfoManagementComponent } from './components/info-management/info-management.component';
import { StatsDashboardComponent } from './components/stats-dashboard/stats-dashboard.component';

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
    StatsDashboardComponent
  ],
  templateUrl: "./admin-panel.component.html",
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent {
  activeTab: AdminTab = 'gallery';

  onTabChange(tab: AdminTab): void {
    this.activeTab = tab;
  }

  onLogout(): void {
    // Aquí iría la lógica para cerrar sesión
    // Por ejemplo, limpiar localStorage, redirigir, etc.
    alert('Sesión cerrada correctamente.');
    console.log('Redirigiendo al login...');
  }
}