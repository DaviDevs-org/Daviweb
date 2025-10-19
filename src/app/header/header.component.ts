import { ChangeDetectionStrategy, Component, inject, OnDestroy, WritableSignal, signal, PLATFORM_ID, afterNextRender } from "@angular/core";
import { ViewportScroller, CommonModule, isPlatformBrowser, NgOptimizedImage } from "@angular/common";
import { InfoManager, BusinessStatus } from "../services/admin-panel/info-management.service";
import { from, interval, Subscription } from "rxjs";
import { switchMap, takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

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

  scrollToSection(elementId: string) {
    // ✅ ViewportScroller es seguro en SSR, pero podemos protegerlo igualmente
    if (isPlatformBrowser(this.platformId)) {
      this.viewportScroller.scrollToAnchor(elementId);
    }
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
    // ✅ Protección adicional aunque ya estamos en el navegador
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // ✅ Usar takeUntil para auto-limpieza
    this.subscription = interval(30000)
      .pipe(
        switchMap(() => this.info.isBusinessOpen()),
        takeUntil(this.destroy$)
      )
      .subscribe(status => {
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
  }

  private startCountdown(minutes: number) {
    // ✅ Solo ejecutar en navegador
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.stopCountdown();
    let remainingSeconds = minutes * 60;

    this.countdownInterval = setInterval(() => {
      remainingSeconds--;
      const current = this.safeBusinessInfo();
      this.safeBusinessInfo.set({
        ...current,
        remainingSeconds: remainingSeconds
      });

      if (remainingSeconds <= 0) {
        this.stopCountdown();
        this.refreshStatus();
      }
    }, 1000);
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
