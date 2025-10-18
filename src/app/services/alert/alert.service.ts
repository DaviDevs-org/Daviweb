import { Injectable, ComponentRef, ApplicationRef, createComponent, Inject, PLATFORM_ID } from '@angular/core';
import { CustomAlertComponent, AlertConfig } from './alert.component';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alertRef?: ComponentRef<CustomAlertComponent>;
  private alertContainer?: HTMLDivElement;
  private isCreating = false; // Flag para prevenir creación simultánea

  constructor(
    private appRef: ApplicationRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // Método principal para mostrar alertas
  private async showAlert(config: AlertConfig): Promise<boolean | string | null | false> {
    while (this.isCreating) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return this.createAlert(config);
  }

  private createAlert(config: AlertConfig): Promise<boolean | string | null | false> {
    return new Promise((resolve) => {
      this.isCreating = true;
      this.closeCurrentAlert();
      try {
        setTimeout(() => {
          try {
            // SOLO EN CLIENTE:
            if (isPlatformBrowser(this.platformId)) {
              this.createAlertContainer();

              const environmentInjector = this.appRef.injector;
              this.alertRef = createComponent(CustomAlertComponent, {
                environmentInjector,
                hostElement: this.alertContainer
              });

              this.alertRef.instance.config = {
                position: 'top-right',
                ...config
              };

              let resolved = false;
              const resolveOnce = (result: any) => {
                if (!resolved) {
                  resolved = true;
                  this.closeCurrentAlert();
                  this.isCreating = false;
                  resolve(result);
                }
              };

              this.alertRef.instance.confirmed.subscribe((result: boolean) => {
                resolveOnce(result);
              });

              this.alertRef.instance.promptResult.subscribe((result: string | null | false) => {
                resolveOnce(result);
              });

              this.alertRef.instance.closed.subscribe(() => {
                if (config.type !== 'confirm' && config.type !== 'prompt') {
                  resolveOnce(true);
                }
              });

              this.alertRef.changeDetectorRef.detectChanges();
              this.appRef.attachView(this.alertRef.hostView);
            }
            this.isCreating = false;
          } catch (error) {
            console.error('Error creating alert component:', error);
            this.isCreating = false;
            resolve(false);
          }
        }, 10);
      } catch (error) {
        console.error('Error in createAlert setup:', error);
        this.isCreating = false;
        resolve(false);
      }
    });
  }

  private createAlertContainer() {
    if (isPlatformBrowser(this.platformId)) {
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
    if (isPlatformBrowser(this.platformId) && this.alertContainer?.parentNode) {
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
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-center'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'success',
      title: 'Éxito',
      message,
      duration: duration || undefined,
      position
    }) as Promise<boolean>;
  }

  error(
    message: string,
    duration: number | null = null,
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-center'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'error',
      title: 'Error',
      message,
      duration: duration || undefined,
      position
    }) as Promise<boolean>;
  }

  warning(
    message: string,
    duration: number | null = 4000,
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-center'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'warning',
      title: 'Advertencia',
      message,
      duration: duration || undefined,
      position
    }) as Promise<boolean>;
  }

  info(
    message: string,
    duration: number | null = 3000,
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-center'
  ): Promise<boolean> {
    return this.showAlert({
      type: 'info',
      title: 'Información',
      message,
      duration: duration || undefined,
      position
    }) as Promise<boolean>;
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
      duration: undefined
    }) as Promise<boolean>;
  }

  /* ========== MÉTODOS PROMPT ========== */

  prompt(
    message: string,
    placeholder: string = '',
    defaultValue: string = '',
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-center'
  ): Promise<string | null | false> {
    return this.showAlert({
      type: 'prompt',
      title: 'Ingresa información',
      message,
      placeholder,
      defaultValue,
      position,
      inputType: 'text',
      duration: undefined
    }) as Promise<string | null | false>;
  }

  promptWithTitle(
    title: string,
    message: string,
    placeholder: string = '',
    defaultValue: string = '',
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-center'
  ): Promise<string | null | false> {
    return this.showAlert({
      type: 'prompt',
      title,
      message,
      placeholder,
      defaultValue,
      position,
      inputType: 'text',
      duration: undefined
    }) as Promise<string | null | false>;
  }

  promptEmail(
    message: string = 'Ingresa tu email',
    placeholder: string = 'email@ejemplo.com',
    defaultValue: string = '',
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-center'
  ): Promise<string | null | false> {
    return this.showAlert({
      type: 'prompt',
      title: 'Email requerido',
      message,
      placeholder,
      defaultValue,
      position,
      inputType: 'email',
      duration: undefined
    }) as Promise<string | null | false>;
  }

  promptPassword(
    message: string = 'Ingresa tu contraseña',
    placeholder: string = '••••••••',
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-center'
  ): Promise<string | null | false> {
    return this.showAlert({
      type: 'prompt',
      title: 'Contraseña requerida',
      message,
      placeholder,
      defaultValue: '',
      position,
      inputType: 'password',
      duration: undefined
    }) as Promise<string | null | false>;
  }

  promptNumber(
    message: string,
    placeholder: string = '0',
    defaultValue: string = '',
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-center'
  ): Promise<string | null | false> {
    return this.showAlert({
      type: 'prompt',
      title: 'Ingresa un número',
      message,
      placeholder,
      defaultValue,
      position,
      inputType: 'number',
      duration: undefined
    }) as Promise<string | null | false>;
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
    }) as Promise<boolean>;
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
    }) as Promise<boolean>;
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
    }) as Promise<boolean>;
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
    }) as Promise<boolean>;
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
    }) as Promise<boolean>;
  }

  /* ========== MÉTODO RÁPIDO ========== */

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
      if (type === 'error') {
        config.duration = undefined;
      } else if (type === 'warning') {
        config.duration = 4000;
      } else {
        config.duration = 3000;
      }
    }
    return this.showAlert(config) as Promise<boolean>;
  }

  /* ========== MÉTODO PERSONALIZADO ========== */

  custom(config: AlertConfig): Promise<boolean | string | null | false> {
    return this.showAlert(config);
  }

  /* ========== CONTROL MANUAL ========== */

  close(): void {
    this.closeCurrentAlert();
    this.isCreating = false;
  }

  isActive(): boolean {
    return !!this.alertRef || this.isCreating;
  }
}
