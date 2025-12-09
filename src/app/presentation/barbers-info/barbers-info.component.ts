// barbers-info.component.ts
import { Component, inject, signal } from '@angular/core';
import { BarberDisplay, BarberSettings } from '@domain/index';
import { CommonModule, ViewportScroller } from '@angular/common';
import { BookingPreselectionService } from '../shared/booking-preselection.service';
import { effect } from '@angular/core';
import { BusinessStateService } from '@presentation/shared/business-state.service';

@Component({
  selector: 'app-barbers-info',
  templateUrl: './barbers-info.component.html',
  styleUrls: ['./barbers-info.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class BarbersInfoComponent {
  private businessState = inject(BusinessStateService);
  private viewportScroller = inject(ViewportScroller);
  private preselectionService = inject(BookingPreselectionService);

  barbers: BarberDisplay[] = [];
  loading = signal(true);
  barberSelectionEnabled = false;

  private readonly barbersEffect = effect(() => {
    const settings = this.businessState.barberSettings();
    if (!settings) {
      this.barberSelectionEnabled = false;
      this.barbers = [];
      this.loading.set(false);
      return;
    }

    this.barberSelectionEnabled = settings.barberSelection ?? false;
    if (!this.barberSelectionEnabled) {
      this.barbers = [];
      this.loading.set(false);
      return;
    }

    this.barbers = settings.barbers.map(
      (barber, index) =>
        new BarberDisplay(
          barber.name,
          barber.imageUrl,
          index === 0,
          this.getRandomSpecialty(),
          this.getRandomExperience(),
          this.getRandomDescription(barber.name)
        )
    );

    this.loading.set(false);
  });

  bookWithBarber(barber: BarberDisplay) {
    // Guardar el peluquero preseleccionado
    this.preselectionService.setBarber(barber.name);
    // Navegar a la sección de citas
    this.viewportScroller.scrollToAnchor('appointments');
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
      'Afeitado Tradicional',
    ];
    return specialties[Math.floor(Math.random() * specialties.length)];
  }

  private getRandomExperience(): number {
    return Math.floor(Math.random() * 15) + 3; // Entre 3 y 17 años
  }

  private getRandomDescription(name: string): string {
    const descriptions = [
      `${
        name.split(' ')[0]
      } es un experto en técnicas tradicionales de peluquería con un toque moderno.`,
      `Especialista en crear el look perfecto para cada cliente, ${
        name.split(' ')[0]
      } combina precisión con creatividad.`,
      `Con años de experiencia, ${
        name.split(' ')[0]
      } domina tanto estilos clásicos como las últimas tendencias.`,
      `${
        name.split(' ')[0]
      } se enfoca en brindar una experiencia premium a cada cliente que atiende.`,
      `Apasionado por la peluquería, ${
        name.split(' ')[0]
      } está siempre actualizado con las nuevas técnicas y estilos.`,
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }
}
