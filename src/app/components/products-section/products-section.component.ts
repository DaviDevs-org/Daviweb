// src/app/components/products-section/products-section.component.ts
import { Component } from '@angular/core';

interface Product {
  image: string;
  name: string;
  price: string;
  description: string;
}

@Component({
  selector: 'app-products-section',
  templateUrl: './products-section.component.html',
})
export class ProductsSectionComponent {
  products: Product[] = [
    {
      image: 'assets/products/pomada-matte.jpg',
      name: 'Pomada Matte Hold',
      price: '15€',
      description: 'Fijación suave, acabado mate.',
    },
    {
      image: 'assets/products/ceramida-cream.jpg',
      name: 'Cera Shine Cream',
      price: '18€',
      description: 'Brillo natural y duradero.',
    },
    {
      image: 'assets/products/shampoo-nutritivo.jpg',
      name: 'Shampoo Nutritivo',
      price: '12€',
      description: 'Limpieza profunda y nutritiva.',
    },
    {
      image: 'assets/products/cepillo-nogal.jpg',
      name: 'Cepillo Nogal',
      price: '20€',
      description: 'Cepillo clásico de madera de nogal.',
    },
  ];
}
