// alert.component.ts
import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AlertConfig {
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm'| 'prompt';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  duration?: number; // Para auto-cierre (en ms)
  mode?: 'modal' | 'toast'; // Nuevo: modo de visualización
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center'; // Para toasts
  placeholder?: string;
  defaultValue?: string;
  inputType?: 'text' | 'email' | 'password' | 'number';
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
    position: 'top-right'
  };
  
  @Output() confirmed = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();
  @Output() promptResult = new EventEmitter<string | null | false>(); // Ahora puede ser false
  
  @ViewChild('promptInput') promptInput?: ElementRef<HTMLInputElement>;
  
  isVisible = false;
  private autoCloseTimer?: number;

  ngOnInit() {
    // Aparición rápida para toast
    setTimeout(() => {
      this.isVisible = true;
      
      // Para prompts, asegurar que el input mantenga el foco
      if (this.config.type === 'prompt') {
        this.focusInput();
      }
    }, 10);
    
    // Auto-cierre solo si hay duración y no es confirmación ni prompt
    if (this.config.duration && this.config.type !== 'confirm' && this.config.type !== 'prompt') {
      this.autoCloseTimer = window.setTimeout(() => {
        this.close();
      }, this.config.duration);
    }
  }

  private focusInput() {
    setTimeout(() => {
      const input = document.querySelector('.toast-input') as HTMLInputElement;
      if (input) {
        input.focus();
        // Si hay un valor por defecto, seleccionarlo
        if (this.config.defaultValue) {
          input.select();
        }
      }
    }, 100);
  }

  getIcon(): string {
    const icons = {
      success: 'bi bi-check-circle-fill',
      error: 'bi bi-x-circle-fill',
      warning: 'bi bi-exclamation-triangle-fill',
      info: 'bi bi-info-circle-fill',
      confirm: 'bi bi-question-circle-fill',
      prompt: 'bi bi-pencil-square'
    };
    return icons[this.config.type];
  }

  confirm() {
    this.clearAutoClose();
    this.confirmed.emit(true);
    this.close();
  }

  cancel() {
    this.clearAutoClose();
    if (this.config.type === 'prompt') {
      // Para prompts, cancelar devuelve false
      this.promptResult.emit(false);
    } else {
      // Para confirmaciones, cancelar devuelve false
      this.confirmed.emit(false);
    }
    this.close();
  }

  confirmPrompt() {
    this.clearAutoClose();
    const inputValue = this.promptInput?.nativeElement.value || '';
    
    // Si el input está vacío (sin contar espacios), devolver null
    if (inputValue.trim() === '') {
      this.promptResult.emit(null);
    } else {
      this.promptResult.emit(inputValue);
    }
    this.close();
  }

  onInputBlur(event: Event) {
    // Prevenir que se cierre al perder el foco accidentalmente
    // Solo durante los primeros segundos después de aparecer
    setTimeout(() => {
      const input = event.target as HTMLInputElement;
      if (input && document.activeElement !== input) {
        input.focus();
      }
    }, 10);
  }

  close() {
    this.clearAutoClose();
    this.isVisible = false;
    setTimeout(() => this.closed.emit(), 200);
  }

  private clearAutoClose() {
    if (this.autoCloseTimer) {
      window.clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = undefined;
    }
  }
}