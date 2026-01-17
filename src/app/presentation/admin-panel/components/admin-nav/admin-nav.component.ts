// admin-nav.component.ts (ACTUALIZADO)
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AdminTab = 'gallery' | 'services' | 'info' | 'appointment' | 'blacklist';

interface NavTab {
  id: AdminTab;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-admin-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-nav.component.html",
  styleUrls: ['./admin-nav.component.scss']
})
export class AdminNavComponent {
  @Input() activeTab: AdminTab = 'gallery';
  @Output() tabChange = new EventEmitter<AdminTab>();

  isMobileMenuOpen = false;

  tabs: NavTab[] = [
    { id: 'gallery', icon: 'bi bi-images', label: 'Galería de Fotos' },
    { id: 'services', icon: 'bi bi-scissors', label: 'Servicios y Precios' },
    { id: 'info', icon: 'bi bi-info-circle', label: 'Información General' },
    { id: 'appointment', icon: 'bi bi-calendar-event', label: 'Citas' },
    { id: 'blacklist', icon: 'bi bi-shield-lock', label: 'Lista Negra' }
  ];

  onTabChange(tab: AdminTab): void {
    this.tabChange.emit(tab);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  onMobileTabChange(tab: AdminTab): void {
    this.onTabChange(tab);
    this.isMobileMenuOpen = false; // Cerrar menú después de seleccionar
  }
}