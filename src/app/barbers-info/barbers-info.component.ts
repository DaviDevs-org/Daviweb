// barbers-info.component.ts
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Injector, OnDestroy, OnInit, runInInjectionContext } from "@angular/core";
import { InfoManager } from "../services/admin-panel/info-management.service";
import { Barber } from "../admin-panel/types/admin.types";
import { Subscription } from "rxjs";
import { Auth } from '@angular/fire/auth';
import { CommonModule, ViewportScroller } from '@angular/common';

// Interfaz extendida para mostrar información adicional del peluquero
interface BarberDisplay extends Barber {
  featured?: boolean;
  specialty?: string;
  experience?: number;
  description?: string;
}

@Component({
  selector: "app-barbers-info",
  templateUrl: "./barbers-info.component.html",
  styleUrls: ["./barbers-info.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class BarbersInfoComponent implements OnInit, OnDestroy {
  private infoManager = inject(InfoManager);
  private auth = inject(Auth);
  private cdr = inject(ChangeDetectorRef);
  private injector = inject(Injector);
  private viewportScroller = inject(ViewportScroller);

  private subscriptions: Subscription[] = [];

  barbers: BarberDisplay[] = [];
  loading = true;
  barberSelectionEnabled = false; // Nueva propiedad para controlar si la sección se muestra

  ngOnInit() {
    runInInjectionContext(this.injector, () => {
      this.loadBarbers();
    });
  }

  private async loadBarbers() {
    try {
      const barberSettings = await this.infoManager.getBarberSettings();
      
      // Verificar si la selección de peluqueros está habilitada
      this.barberSelectionEnabled = barberSettings?.settings?.barberSelection ?? false;
      
      // Si no está habilitada, no mostrar peluqueros
      if (!this.barberSelectionEnabled) {
        this.barbers = [];
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }
      
      // Obtener solo los peluqueros visibles
      let visibleBarbers: Barber[] = [];
      
      if (barberSettings?.settings?.staff) {
        visibleBarbers = barberSettings.settings.staff.filter((barber: Barber) => barber.visible);
      } else if (Array.isArray(barberSettings?.settings.staff)) {
        visibleBarbers = barberSettings.settings.staff.filter((barber: Barber) => barber.visible);
      }

      // Convertir a BarberDisplay con información adicional
      this.barbers = visibleBarbers.map((barber, index) => ({
        ...barber,
        featured: index === 0, // El primero será destacado por defecto
        specialty: this.getRandomSpecialty(),
        experience: this.getRandomExperience(),
        description: this.getRandomDescription(barber.name)
      }));

      this.loading = false;
      this.cdr.detectChanges();
      
    } catch (error) {
      console.error('Error cargando peluqueros:', error);
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  scrollToSection(elementId: string) {
    this.viewportScroller.scrollToAnchor(elementId);
  }

  // Métodos para generar información adicional de ejemplo
  private getRandomSpecialty(): string {
    const specialties = [
      'Cortes Clásicos',
      'Barbas & Bigotes',
      'Fade Moderno',
      'Estilo Vintage',
      'Cortes Creativos',
      'Afeitado Tradicional'
    ];
    return specialties[Math.floor(Math.random() * specialties.length)];
  }

  private getRandomExperience(): number {
    return Math.floor(Math.random() * 15) + 3; // Entre 3 y 17 años
  }

  private getRandomDescription(name: string): string {
    const descriptions = [
      `${name.split(' ')[0]} es un experto en técnicas tradicionales de peluquería con un toque moderno.`,
      `Especialista en crear el look perfecto para cada cliente, ${name.split(' ')[0]} combina precisión con creatividad.`,
      `Con años de experiencia, ${name.split(' ')[0]} domina tanto estilos clásicos como las últimas tendencias.`,
      `${name.split(' ')[0]} se enfoca en brindar una experiencia premium a cada cliente que atiende.`,
      `Apasionado por la peluquería, ${name.split(' ')[0]} está siempre actualizado con las nuevas técnicas y estilos.`
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}