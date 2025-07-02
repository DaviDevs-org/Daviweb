// src/app/components/faq-section/faq-section.component.ts
import { Component } from '@angular/core';

interface FAQ {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-faq-section',
  templateUrl: './faq-section.component.html',
})
export class FAQSectionComponent {
  faqs: FAQ[] = [
    {
      question: '¿Cómo reservo si aún no está habilitado el sistema online?',
      answer: 'Por teléfono, WhatsApp o viniendo directamente al local. En breve lanzaremos la opción de reservas online.',
    },
    {
      question: '¿Se puede comprar productos si no vivo cerca?',
      answer: 'Sí, enviamos a toda España. Pregúntanos por WhatsApp.',
    },
    {
      question: '¿Aceptan pagos con tarjeta o solo efectivo?',
      answer: 'Actualmente aceptamos ambos; pronto también pasarelas de pago online.',
    },
  ];
  toggleIndex: number | null = null;

  toggle(i: number) {
    this.toggleIndex = this.toggleIndex === i ? null : i;
  }
}
