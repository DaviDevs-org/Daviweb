// src/app/components/reviews-section/reviews-section.component.ts
import { Component } from '@angular/core';

interface Review {
  avatar: string;
  name: string;
  rating: number;
  text: string;
}

@Component({
  selector: 'app-reviews-section',
  templateUrl: './reviews-section.component.html',
})
export class ReviewsSectionComponent {
  reviews: Review[] = [
    {
      avatar: 'assets/review1.jpg',
      name: 'Juan P.',
      rating: 5,
      text: 'Excelente trato, corte preciso en 20 minutos.',
    },
    {
      avatar: 'assets/review2.jpg',
      name: 'Ana G.',
      rating: 4,
      text: 'Muy profesional y buen ambiente.',
    },
    {
      avatar: 'assets/review3.jpg',
      name: 'Luis M.',
      rating: 5,
      text: 'El mejor corte que he tenido, lo recomiendo.',
    },
  ];

  getStars(n: number): number[] {
    return Array(n);
  }
}
