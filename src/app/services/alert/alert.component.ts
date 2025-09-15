// alert.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AlertConfig {
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  duration?: number; // Para auto-cierre (en ms)
  mode?: 'modal' | 'toast'; // Nuevo: modo de visualización
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center'; // Para toasts
}

@Component({
  selector: 'app-custom-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss']
})
export class CustomAlertComponent implements OnInit {
  @Input() config: AlertConfig = {
    type: 'info',
    title: '',
    message: '',
    mode: 'modal',
    position: 'top-right'
  };
  
  @Output() confirmed = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();
  
  isVisible = false;
  private autoCloseTimer?: number;

  ngOnInit() {
    // Para toasts, aparición más rápida
    const delay = this.config.mode === 'toast' ? 10 : 50;
    setTimeout(() => this.isVisible = true, delay);
    
    // Auto-cierre para notificaciones (no para confirmaciones)
    if (this.config.duration && this.config.type !== 'confirm') {
      this.autoCloseTimer = window.setTimeout(() => {
        this.close();
      }, this.config.duration);
    }
  }

  getIcon(): string {
    const icons = {
      success: 'bi bi-check-circle-fill',
      error: 'bi bi-x-circle-fill',
      warning: 'bi bi-exclamation-triangle-fill',
      info: 'bi bi-info-circle-fill',
      confirm: 'bi bi-question-circle-fill'
    };
    return icons[this.config.type];
  }

  getButtonClass(): string {
    const classes = {
      success: 'btn-success',
      error: 'btn-danger',
      warning: 'btn-warning',
      info: 'btn-primary',
      confirm: 'btn-primary'
    };
    return classes[this.config.type];
  }

  getDefaultConfirmText(): string {
    const texts = {
      success: 'Entendido',
      error: 'Cerrar',
      warning: 'Entendido',
      info: 'OK',
      confirm: 'Confirmar'
    };
    return texts[this.config.type];
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget && this.config.type !== 'confirm') {
      this.close();
    }
  }

  confirm() {
    this.clearAutoClose();
    this.confirmed.emit(true);
    this.close();
  }

  cancel() {
    this.clearAutoClose();
    this.confirmed.emit(false);
    this.close();
  }

  close() {
    this.clearAutoClose();
    this.isVisible = false;
    const delay = this.config.mode === 'toast' ? 200 : 300;
    setTimeout(() => this.closed.emit(), delay);
  }

  private clearAutoClose() {
    if (this.autoCloseTimer) {
      window.clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = undefined;
    }
  }
}