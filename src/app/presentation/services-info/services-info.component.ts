import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Service, ServiceCategory } from '@domain/services';
import { effect } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { BookingPreselectionService } from '@presentation/shared/booking-preselection.service';
import { BusinessStateService } from '@presentation/shared/business-state.service';
import { TenantService } from 'src/app/config/tenant.service';

@Component({
  selector: 'app-services-info',
  templateUrl: './services-info.component.html',
  styleUrls: ['./services-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
})
export class ServicesInfoComponent {
  private businessState = inject(BusinessStateService);
  private viewportScroller = inject(ViewportScroller);
  private preselectionService = inject(BookingPreselectionService);
  private tenantService = inject(TenantService);
  public tenantConfig = this.tenantService.getTenantConfig().features;

  categories = signal<ServiceCategory[]>([]);
  selectedCategory = signal<ServiceCategory | null>(null);
  selectedService = signal<Service | null>(null);
  loading = signal(true);

  private readonly servicesEffect = effect(() => {
    const services = this.businessState.services();
    if (!services || services.length === 0) {
      this.loading.set(false);
      return;
    }
    this.organizeServicesByCategory(services);
    this.loading.set(false);
  });

  private organizeServicesByCategory(services: Service[]) {
    const categoryMap = new Map<string, Service[]>();

    services.forEach((service) => {
      const category = this.getCategoryFromService(service);
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)?.push(service);
    });

    const unsorted: ServiceCategory[] = Array.from(categoryMap.entries()).map(
      ([categoryName, services]) => ({
        id: categoryName.toLowerCase().replace(/\s+/g, '-'),
        name: categoryName,
        icon: this.getCategoryIcon(categoryName),
        services: services,
      })
    );

    // Orden lógico deseado
    const desiredOrder = [
      'Cortes',
      'Tintes',
      'Lavado',
      'Barba & Bigote',
      'Cejas & Depilación',
      'Otros',
    ];
    const sortedCategories = unsorted.sort((a, b) => {
      const ia = desiredOrder.indexOf(a.name);
      const ib = desiredOrder.indexOf(b.name);
      const av = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
      const bv = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
      return av - bv;
    });

    this.categories.set(sortedCategories);

    if (sortedCategories.length > 0) {
      this.selectCategory(sortedCategories[0]);
    }
  }

  bookService(service: Service) {
    // Guardar el servicio preseleccionado
    this.preselectionService.setService(service.name);
    // Navegar a la sección de citas
    this.viewportScroller.scrollToAnchor('appointments');
  }

  scrollToSection(elementId: string) {
    this.viewportScroller.scrollToAnchor(elementId);
  }

  private getCategoryFromService(service: Service): string {
    // Lógica para determinar la categoría basada en el nombre del servicio
    const name = service.name.toLowerCase();

    if (
      name.includes('corte') ||
      name.includes('fade') ||
      name.includes('rapado')
    ) {
      return 'Cortes';
    } else if (name.includes('barba') || name.includes('bigote')) {
      return 'Barba & Bigote';
    } else if (name.includes('tinte') || name.includes('color')) {
      return 'Tintes';
    } else if (name.includes('lavado') || name.includes('champú')) {
      return 'Lavado';
    } else if (name.includes('ceja') || name.includes('depilación')) {
      return 'Cejas & Depilación';
    } else {
      return 'Otros';
    }
  }

  private getCategoryIcon(categoryName: string): string {
    const iconMap: { [key: string]: string } = {
      Cortes: 'bi-scissors',
      'Barba & Bigote': 'bi-mustache',
      Tintes: 'bi-palette',
      Lavado: 'bi-droplet',
      'Cejas & Depilación': 'bi-eye',
      Otros: 'bi-tools',
    };

    return iconMap[categoryName] || 'bi-gear';
  }

  selectCategory(category: ServiceCategory) {
    this.selectedCategory.set(category);
    // Seleccionar el primer servicio de la categoría
    if (category.services.length > 0) {
      this.selectedService.set(category.services[0]);
    } else {
      this.selectedService.set(null);
    }
  }

  selectService(service: Service) {
    this.selectedService.set(service);
  }

  // --- Calcular min y max posibles ---
  getMinTime(service: Service): number | null {
    if (service.requiresHairLength && service.hairLengthModifiers) {
      let min = Infinity;
      for (const key of Object.keys(service.hairLengthModifiers)) {
        const mod: any = (service.hairLengthModifiers as any)[key];
        if (!mod) continue;
        let total = 0;
        if (Array.isArray(mod.segments) && mod.segments.length) {
          total = mod.segments.reduce(
            (acc: number, seg: any) =>
              acc + (seg.duration || 0) + (seg.breakAfter || 0),
            0
          );
        } else if (typeof mod.time === 'number') {
          total = mod.time;
        }
        if (total > 0 && total < min) min = total;
      }
      return min === Infinity ? null : min;
    } else {
      const active =
        service.timeSegments?.reduce(
          (acc, seg) => acc + (seg.duration || 0),
          0
        ) || 0;
      return active || null;
    }
  }

  getMaxTime(service: Service): number | null {
    if (service.requiresHairLength && service.hairLengthModifiers) {
      let max = 0;
      for (const key of Object.keys(service.hairLengthModifiers)) {
        const mod: any = (service.hairLengthModifiers as any)[key];
        if (!mod) continue;
        let total = 0;
        if (Array.isArray(mod.segments) && mod.segments.length) {
          total = mod.segments.reduce(
            (acc: number, seg: any) =>
              acc + (seg.duration || 0) + (seg.breakAfter || 0),
            0
          );
        } else if (typeof mod.time === 'number') {
          total = mod.time;
        }
        if (total > max) max = total;
      }
      return max > 0 ? max : null;
    } else {
      // total con pausas
      const total =
        service.timeSegments?.reduce(
          (acc, seg) => acc + (seg.duration || 0) + (seg.breakAfter || 0),
          0
        ) || 0;
      return total || null;
    }
  }

  hasRange(service: Service): boolean {
    const min = this.getMinTime(service);
    const max = this.getMaxTime(service);
    return !!(min && max && min !== max);
  }
}
