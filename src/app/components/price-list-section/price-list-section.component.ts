// src/app/components/price-list-section/price-list-section.component.ts
import { Component } from '@angular/core';

interface Service {
  name: string;
  price: string;
  duration: string;
  premium?: boolean;
}

@Component({
  selector: 'app-price-list-section',
  templateUrl: './price-list-section.component.html',
})
export class PriceListSectionComponent {
  services: Service[] = [
    { name: 'Corte clásico', price: '20€', duration: '25 min' },
    { name: 'Fade completo', price: '25€', duration: '30 min', premium: true },
    { name: 'Corte + Afeitado', price: '30€', duration: '45 min', premium: true },
    { name: 'Recorte de barba', price: '15€', duration: '15 min' },
    { name: 'Corte infantil', price: '18€', duration: '20 min' },
  ];
}
