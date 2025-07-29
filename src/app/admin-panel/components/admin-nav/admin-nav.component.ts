// admin-nav.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AdminTab = 'gallery' | 'services' | 'info' | 'stats';

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

  tabs: NavTab[] = [
    { id: 'gallery', icon: 'bi bi-images', label: 'Galería de Fotos' },
    { id: 'services', icon: 'bi bi-scissors', label: 'Servicios y Precios' },
    { id: 'info', icon: 'bi bi-info-circle', label: 'Información General' },
    { id: 'stats', icon: 'bi bi-graph-up', label: 'Estadísticas' }
  ];

  onTabChange(tab: AdminTab): void {
    this.tabChange.emit(tab);
  }
}