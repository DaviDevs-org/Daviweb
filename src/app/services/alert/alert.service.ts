// alert.service.ts
import { Injectable, ComponentRef, ApplicationRef, createComponent } from '@angular/core';
import { CustomAlertComponent, AlertConfig } from './alert.component';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alertRef?: ComponentRef<CustomAlertComponent>;
  private alertContainer?: HTMLDivElement;

  constructor(private appRef: ApplicationRef) {}

  // Método principal para mostrar alertas
  private showAlert(config: AlertConfig): Promise<boolean> {
    return new Promise((resolve) => {
      // Cerrar alerta anterior si existe
      this.closeCurrentAlert();

      try {
        // Crear contenedor para la alerta
        this.createAlertContainer();

        // Crear el componente
        const environmentInjector = this.appRef.injector;
        this.alertRef = createComponent(CustomAlertComponent, {
          environmentInjector,
          hostElement: this.alertContainer
        });
        
        // Configurar el componente
        this.alertRef.instance.config = {
          mode: 'modal', // Por defecto modal
          position: 'top-right', // Por defecto para toast
          ...config
        };

        // Escuchar eventos
        this.alertRef.instance.confirmed.subscribe((result: boolean) => {
          resolve(result);
          this.closeCurrentAlert();
        });

        this.alertRef.instance.closed.subscribe(() => {
          if (config.type !== 'confirm') {
            resolve(true);
          }
          this.closeCurrentAlert();
        });

        // Detectar cambios y registrar
        this.alertRef.changeDetectorRef.detectChanges();
        this.appRef.attachView(this.alertRef.hostView);
        
      } catch (error) {
        console.error('Error creating alert component:', error);
        resolve(false);
      }
    });
  }

  private createAlertContainer() {
    this.alertContainer = document.createElement('div');
    this.alertContainer.id = 'alert-container-' + Date.now();
    this.alertContainer.style.position = 'fixed';
    this.alertContainer.style.top = '0';
    this.alertContainer.style.left = '0';
    this.alertContainer.style.width = '100%';
    this.alertContainer.style.height = '100%';
    this.alertContainer.style.pointerEvents = 'none';
    this.alertContainer.style.zIndex = '10000';
    
    document.body.appendChild(this.alertContainer);
  }

  private closeCurrentAlert() {
    if (this.alertRef) {
      try {
        this.appRef.detachView(this.alertRef.hostView);
        this.alertRef.destroy();
        this.alertRef = undefined;
      } catch (error) {
        console.error('Error closing alert:', error);
        this.alertRef = undefined;
      }
    }

    if (this.alertContainer?.parentNode) {
      try {
        this.alertContainer.parentNode.removeChild(this.alertContainer);
        this.alertContainer = undefined;
      } catch (error) {
        console.error('Error removing alert container:', error);
        this.alertContainer = undefined;
      }
    }
  }

  /* ========== MÉTODOS MODALES (Intrusivos) ========== */
  
  success(title: string, message: string, duration: number = 4000): Promise<boolean> {
    return this.showAlert({
      type: 'success',
      title,
      message,
      duration,
      mode: 'modal',
      confirmText: 'Entendido'
    });
  }

  error(title: string, message: string): Promise<boolean> {
    return this.showAlert({
      type: 'error',
      title,
      message,
      mode: 'modal',
      confirmText: 'Cerrar'
    });
  }

  warning(title: string, message: string): Promise<boolean> {
    return this.showAlert({
      type: 'warning',
      title,
      message,
      mode: 'modal',
      confirmText: 'Entendido'
    });
  }

  info(title: string, message: string, duration: number = 4000): Promise<boolean> {
    return this.showAlert({
      type: 'info',
      title,
      message,
      duration,
      mode: 'modal',
      confirmText: 'OK'
    });
  }

  confirm(
    title: string, 
    message: string, 
    confirmText: string = 'Confirmar', 
    cancelText: string = 'Cancelar'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'confirm',
      title,
      message,
      mode: 'modal',
      confirmText,
      cancelText
    });
  }

  /* ========== MÉTODOS TOAST (No intrusivos) ========== */
  
  toastSuccess(
    message: string, 
    duration: number = 3000, 
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-right'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'success',
      title: 'Éxito',
      message,
      duration,
      mode: 'toast',
      position
    });
  }

  toastError(
    message: string, 
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-right'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'error',
      title: 'Error',
      message,
      mode: 'toast',
      position
    });
  }

  toastWarning(
    message: string, 
    duration: number = 4000, 
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-right'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'warning',
      title: 'Advertencia',
      message,
      duration,
      mode: 'toast',
      position
    });
  }

  toastInfo(
    message: string, 
    duration: number = 3000, 
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-right'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'info',
      title: 'Información',
      message,
      duration,
      mode: 'toast',
      position
    });
  }

  /* ========== MÉTODOS DE CONVENIENCIA ========== */
  
  // Toast rápido (solo mensaje, sin título personalizado)
  toast(
    type: 'success' | 'error' | 'warning' | 'info', 
    message: string, 
    duration?: number
  ): Promise<boolean> {
    const config: AlertConfig = {
      type,
      title: type.charAt(0).toUpperCase() + type.slice(1),
      message,
      mode: 'toast',
      position: 'top-right'
    };

    if (duration !== undefined) {
      config.duration = duration;
    } else {
      config.duration = type === 'error' ? 5000 : 3000;
    }

    return this.showAlert(config);
  }

  // Método personalizado para configuraciones específicas
  custom(config: AlertConfig): Promise<boolean> {
    return this.showAlert(config);
  }

  // Cerrar alerta manualmente
  close(): void {
    this.closeCurrentAlert();
  }
}