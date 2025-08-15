// services-info.component.ts
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Injector, OnDestroy, OnInit, runInInjectionContext } from "@angular/core";
import { ServiceManager } from "../services/admin-panel/services-management.service";
import { Service } from "../admin-panel/types/admin.types";
import { Subscription } from "rxjs";
import { Auth } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  services: Service[];
}

@Component({
  selector: "app-services-info",
  templateUrl: "./services-info.component.html",
  styleUrls: ["./services-info.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class ServicesInfoComponent implements OnInit, OnDestroy {
  private service = inject(ServiceManager);
  private auth = inject(Auth);
  private cdr = inject(ChangeDetectorRef);
  private injector = inject(Injector);

  private subscriptions: Subscription[] = [];

  categories: ServiceCategory[] = [];
  selectedCategory: ServiceCategory | null = null;
  selectedService: Service | null = null;
  loading = true;

  ngOnInit() {
    runInInjectionContext(this.injector, () => {
      const s1 = this.service.getServices().subscribe(services => {
        this.organizeServicesByCategory(services);
        this.loading = false;
        this.cdr.detectChanges();
      }, err => {
        console.error('Error cargando servicios:', err);
        this.loading = false;
        this.cdr.detectChanges();
      });

      this.subscriptions.push(s1);
    });
  }

  private organizeServicesByCategory(services: Service[]) {
    // Agrupar servicios por categoría
    const categoryMap = new Map<string, Service[]>();
    
    services.forEach(service => {
      // Asumiendo que tienes un campo 'category' en tu Service type
      // Si no lo tienes, puedes categorizar por nombre o añadir este campo
      const category = this.getCategoryFromService(service);
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)?.push(service);
    });

    // Crear categorías con iconos
    this.categories = Array.from(categoryMap.entries()).map(([categoryName, services]) => ({
      id: categoryName.toLowerCase().replace(/\s+/g, '-'),
      name: categoryName,
      icon: this.getCategoryIcon(categoryName),
      services: services
    }));

    // Seleccionar la primera categoría por defecto
    if (this.categories.length > 0) {
      this.selectCategory(this.categories[0]);
    }
  }

  private getCategoryFromService(service: Service): string {
    // Lógica para determinar la categoría basada en el nombre del servicio
    const name = service.name.toLowerCase();
    
    if (name.includes('corte') || name.includes('fade') || name.includes('rapado')) {
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
      'Cortes': 'bi-scissors',
      'Barba & Bigote': 'bi-mustache',
      'Tintes': 'bi-palette',
      'Lavado': 'bi-droplet',
      'Cejas & Depilación': 'bi-eye',
      'Otros': 'bi-tools'
    };
    
    return iconMap[categoryName] || 'bi-gear';
  }

  selectCategory(category: ServiceCategory) {
    this.selectedCategory = category;
    // Seleccionar el primer servicio de la categoría
    if (category.services.length > 0) {
      this.selectedService = category.services[0];
    } else {
      this.selectedService = null;
    }
    this.cdr.detectChanges();
  }

  selectService(service: Service) {
    this.selectedService = service;
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}