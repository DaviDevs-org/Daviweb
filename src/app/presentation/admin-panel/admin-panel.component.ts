// admin-panel.component.ts (Refactorizado)
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AdminHeaderComponent } from './components/admin-header/admin-header.component';
import {
  AdminNavComponent,
  AdminTab,
} from './components/admin-nav/admin-nav.component';
import { GalleryManagementComponent } from './components/gallery-management/gallery-management.component';
import { ServicesManagementComponent } from './components/services-management/services-management.component';
import { InfoManagementComponent } from './components/info-management/info-management.component';
import { AuthenticationService } from '../shared/authentication.service';
import { AppointmentManagementComponent } from './components/appointment-management/appointment-management.component';
import { BlacklistManagementComponent } from './components/blacklist-management/blacklist-management.component';
import { PaymentManagementComponent } from './components/payment-management/payment-management.component';

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
    AppointmentManagementComponent,
    BlacklistManagementComponent,
    PaymentManagementComponent,
  ],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss'],
})
export class AdminPanelComponent implements OnInit {
  private auth = inject(AuthenticationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  activeTab: AdminTab = 'gallery';

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['tab']) {
        this.activeTab = params['tab'] as AdminTab;
      }
    });
  }

  onTabChange(tab: AdminTab): void {
    this.activeTab = tab;
    // Update URL without reloading to reflect tab change
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab },
      queryParamsHandling: 'merge', // merge with existing query params
    });
  }

  onLogout(): void {
    this.auth.logOut();
  }
}
