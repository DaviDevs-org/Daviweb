import { CommonModule, ViewportScroller } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from "@angular/core";
import { InfoManager, BusinessStatus } from "../services/admin-panel/info-management.service";
import { BehaviorSubject, interval, switchMap, takeWhile, tap, combineLatest, map } from "rxjs";

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class HeaderComponent implements OnInit, OnDestroy {
  private viewportScroller = inject(ViewportScroller);
  private info = inject(InfoManager);
  
  private businessStatus$ = new BehaviorSubject<BusinessStatus>({
    isOpen: false,
    currentDay: '',
    isWarning: false,
    remainingMinutes: 0
  });

  // Observable para el contador en tiempo real
  private countdown$ = new BehaviorSubject<number>(0);
  
  // Combinamos el status del negocio con el contador
  businessInfo = combineLatest([
    this.businessStatus$.asObservable(),
    this.countdown$.asObservable()
  ]).pipe(
    map(([status, remainingSeconds]) => ({
      ...status,
      remainingSeconds
    }))
  );

  private isDestroyed = false;
  private countdownInterval: any = null;

  ngOnInit() {
    this.updateBusinessStatus();
    this.startStatusUpdater();
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private async updateBusinessStatus() {
    try {
      const status = await this.info.isBusinessOpen();
      this.businessStatus$.next(status);
      
      // Si hay advertencia (próximo a abrir/cerrar), iniciar cuenta atrás
      if (status.isWarning && status.remainingMinutes && status.remainingMinutes > 0) {
        this.startCountdown(status.remainingMinutes);
      } else {
        this.stopCountdown();
      }
      
      console.log(status);
    } catch (error) {
      console.error('Error updating business status:', error);
    }
  }

  private startStatusUpdater() {
    // Actualizar el status del negocio cada 2 minutos (para no sobrecargar)
    interval(120000)
      .pipe(
        takeWhile(() => !this.isDestroyed),
        switchMap(() => this.info.isBusinessOpen()),
        tap(status => {
          this.businessStatus$.next(status);
          
          // Solo reiniciar countdown si hay cambios significativos
          if (status.isWarning && status.remainingMinutes && status.remainingMinutes > 0) {
            const currentSeconds = this.countdown$.value;
            const expectedSeconds = (status.remainingMinutes + 1) * 60;
            
            // Si la diferencia es mayor a 30 segundos, reiniciar
            if (Math.abs(currentSeconds - expectedSeconds) > 30) {
              this.startCountdown(status.remainingMinutes);
            }
          } else {
            this.stopCountdown();
          }
        })
      )
      .subscribe({
        error: (error) => console.error('Error in status updater:', error)
      });
  }

  private startCountdown(minutes: number) {
    this.stopCountdown(); // Limpiar cualquier countdown anterior
    
    let remainingSeconds = (minutes + 1) * 60;
    this.countdown$.next(remainingSeconds);
    
    this.countdownInterval = setInterval(() => {
      remainingSeconds--;
      
      if (remainingSeconds <= 0) {
        this.stopCountdown();
        // Actualizar status cuando termine la cuenta atrás
        this.updateBusinessStatus();
        return;
      }
      
      this.countdown$.next(remainingSeconds);
    }, 1000);
  }

  private stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.countdown$.next(0);
  }

  scrollToSection(elementId: string) {
    this.viewportScroller.scrollToAnchor(elementId);
  }

  formatRemainingTime(seconds: number): string {
    if (seconds <= 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}