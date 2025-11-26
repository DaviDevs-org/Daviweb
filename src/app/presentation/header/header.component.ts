import { ChangeDetectionStrategy, Component, inject, OnDestroy, WritableSignal, signal, PLATFORM_ID, afterNextRender, NgZone } from "@angular/core";
import { ViewportScroller, CommonModule, isPlatformBrowser, NgOptimizedImage } from "@angular/common";
import { InfoManager, BusinessStatus } from "../services/admin-panel/info-management.service";
import { from, interval, Subscription } from "rxjs";
import { switchMap, takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";
import { Router, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.scss"],
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnDestroy {
  private viewportScroller = inject(ViewportScroller);
  private info = inject(InfoManager);
  private platformId = inject(PLATFORM_ID);
  private destroy$ = new Subject<void>();
  private ngZone = inject(NgZone);
  private router = inject(Router);

  // Señal editable (WritableSignal) con toda la estructura de BusinessStatus
  safeBusinessInfo: WritableSignal<BusinessStatus> = signal({
    isOpen: false,
    currentDay: '',
    openTime: undefined,
    closeTime: undefined,
    nextOpenTime: undefined,
    nextOpenDay: undefined,
    timeUntilChange: undefined,
    isWarning: false,
    warningType: undefined,
    remainingMinutes: 0,
    remainingSeconds: 0
  });

  private countdownInterval: any = null;
  private subscription: Subscription | null = null;

  constructor() {
    // ✅ Solo ejecutar en el navegador usando afterNextRender
    afterNextRender(() => {
      this.initializeBusinessStatus();
    });
  }

  ngOnDestroy() {
    // ✅ Limpieza completa de todos los recursos
    this.destroy$.next();
    this.destroy$.complete();

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  scrollToSection(sectionId: string) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Disparar evento para forzar carga de la sección y todas las anteriores
    window.dispatchEvent(new CustomEvent('force-load-section', { 
      detail: { sectionId } 
    }));

    // Esperar a que los componentes se carguen (tiempo reducido porque ya no hay cambios de altura intermedios)
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        // Doble requestAnimationFrame para asegurar que el layout esté estable
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      }
    }, 300); // Reducido a 300ms ya que todas las secciones anteriores están cargadas
  }

  // ✅ Método extraído para inicialización solo en navegador
  private initializeBusinessStatus() {
    // Cargar estado inicial
    from(this.info.isBusinessOpen()).subscribe(status => {
      this.safeBusinessInfo.set({
        ...status,
        remainingSeconds: status.remainingMinutes ? status.remainingMinutes * 60 : 0
      });
      if (status.isWarning && status.remainingMinutes) {
        this.startCountdown(status.remainingMinutes);
      }
    });

    // Iniciar actualizaciones periódicas
    this.startUpdater();
  }

  private startUpdater() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.subscription = interval(30000)
        .pipe(
          switchMap(() => this.info.isBusinessOpen()),
          takeUntil(this.destroy$)
        )
        .subscribe(status => {
          this.ngZone.run(() => {
            this.safeBusinessInfo.set({
              ...status,
              remainingSeconds: status.remainingMinutes ? status.remainingMinutes * 60 : 0
            });

            if (status.isWarning && status.remainingMinutes) {
              this.startCountdown(status.remainingMinutes);
            } else {
              this.stopCountdown();
            }
          });
        });
    });
  }

  private startCountdown(minutes: number) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.stopCountdown();
    let remainingSeconds = minutes * 60;

    // ✅ Ejecutar fuera de la zona de Angular
    this.ngZone.runOutsideAngular(() => {
      this.countdownInterval = setInterval(() => {
        remainingSeconds--;

        // ✅ Volver a la zona para actualizar señales
        this.ngZone.run(() => {
          const current = this.safeBusinessInfo();
          this.safeBusinessInfo.set({
            ...current,
            remainingSeconds: remainingSeconds
          });

          if (remainingSeconds <= 0) {
            this.stopCountdown();
            this.refreshStatus();
          }
        });
      }, 1000);
    });
  }

  private stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private async refreshStatus() {
    try {
      const status = await this.info.isBusinessOpen();
      this.safeBusinessInfo.set({
        ...status,
        remainingSeconds: status.remainingMinutes ? status.remainingMinutes * 60 : 0
      });
    } catch (err) {
      console.error('Error refreshing business status:', err);
    }
  }

  formatRemainingTime(seconds: number): string {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
