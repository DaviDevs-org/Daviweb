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
        
        // Configurar el componente con valores por defecto
        this.alertRef.instance.config = {
          position: 'top-right',
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

  /* ========== MÉTODOS PRINCIPALES ========== */
  
  success(
    message: string, 
    duration: number | null = 3000, 
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-right'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'success',
      title: 'Éxito',
      message,
      duration: duration || undefined,
      position
    });
  }

  error(
    message: string, 
    duration: number | null = null, // Errores persistentes por defecto
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-right'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'error',
      title: 'Error',
      message,
      duration: duration || undefined,
      position
    });
  }

  warning(
    message: string, 
    duration: number | null = 4000, 
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-right'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'warning',
      title: 'Advertencia',
      message,
      duration: duration || undefined,
      position
    });
  }

  info(
    message: string, 
    duration: number | null = 3000, 
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-right'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'info',
      title: 'Información',
      message,
      duration: duration || undefined,
      position
    });
  }

  confirm(
    message: string, 
    confirmText: string = 'Confirmar',
    cancelText: string = 'Cancelar',
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-center'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'confirm',
      title: 'Confirmación',
      message,
      confirmText,
      cancelText,
      position,
      duration: undefined // Confirmaciones siempre persistentes
    });
  }

  /* ========== MÉTODOS CON TÍTULOS PERSONALIZADOS ========== */
  
  successWithTitle(
    title: string,
    message: string, 
    duration: number | null = 3000, 
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-right'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'success',
      title,
      message,
      duration: duration || undefined,
      position
    });
  }

  errorWithTitle(
    title: string,
    message: string, 
    duration: number | null = null, 
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-right'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'error',
      title,
      message,
      duration: duration || undefined,
      position
    });
  }

  warningWithTitle(
    title: string,
    message: string, 
    duration: number | null = 4000, 
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-right'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'warning',
      title,
      message,
      duration: duration || undefined,
      position
    });
  }

  infoWithTitle(
    title: string,
    message: string, 
    duration: number | null = 3000, 
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-right'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'info',
      title,
      message,
      duration: duration || undefined,
      position
    });
  }

  confirmWithTitle(
    title: string,
    message: string, 
    confirmText: string = 'Confirmar',
    cancelText: string = 'Cancelar',
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-center'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'confirm',
      title,
      message,
      confirmText,
      cancelText,
      position,
      duration: undefined
    });
  }

  /* ========== MÉTODO RÁPIDO ========== */
  
  // Notificación rápida con título automático
  notify(
    type: 'success' | 'error' | 'warning' | 'info', 
    message: string, 
    duration?: number | null,
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center'
  ): Promise<boolean> {
    const titles = {
      success: 'Éxito',
      error: 'Error',
      warning: 'Advertencia',
      info: 'Información'
    };

    const config: AlertConfig = {
      type,
      title: titles[type],
      message,
      position: position || 'top-right'
    };

    if (duration !== undefined) {
      config.duration = duration || undefined;
    } else {
      // Duración por defecto según tipo
      if (type === 'error') {
        config.duration = undefined; // Errores persistentes por defecto
      } else if (type === 'warning') {
        config.duration = 4000;
      } else {
        config.duration = 3000;
      }
    }

    return this.showAlert(config);
  }

  /* ========== MÉTODO PERSONALIZADO ========== */
  
  custom(config: AlertConfig): Promise<boolean> {
    return this.showAlert(config);
  }

  /* ========== CONTROL MANUAL ========== */
  
  // Cerrar alerta manualmente
  close(): void {
    this.closeCurrentAlert();
  }
}