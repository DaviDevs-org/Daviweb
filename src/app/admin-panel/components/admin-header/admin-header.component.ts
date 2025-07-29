// admin-header.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="admin-header">
      <div class="header-content">
        <div class="brand-section">
          <div class="scissors-icon">✂️</div>
          <h1>PELUQUERÍA MODERNA</h1>
          <span class="admin-badge">Panel de Administración</span>
        </div>
        <div class="user-section">
          <span class="welcome-text">Bienvenido, Administrador</span>
          <button class="logout-btn" (click)="onLogout()">
            <i class="bi bi-box-arrow-right"></i>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </header>
  `,
  styleUrls: ['./admin-header.component.scss']
})
export class AdminHeaderComponent {
  @Output() logout = new EventEmitter<void>();

  onLogout(): void {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      this.logout.emit();
    }
  }
}