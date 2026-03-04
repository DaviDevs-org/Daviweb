import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StripeService } from '../../../infrastructure/payment/stripe.service';

@Component({
  selector: 'app-stripe-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stripe-payment.component.html',
  styleUrls: ['./stripe-payment.component.scss']
})
export class StripePaymentComponent implements OnChanges {
  @Input() clientSecret!: string;
  @Input() stripeAccountId?: string; // Nuevo Input para la cuenta conectada
  @Output() paymentSuccess = new EventEmitter<string>();
  @Output() paymentError = new EventEmitter<string>();

  private stripeService = inject(StripeService);
  isProcessing = signal(false);

  constructor() {
    // La inicialización se hace automáticamente en el servicio
  }

  async ngOnChanges(changes: SimpleChanges) {
    if ((changes['clientSecret'] || changes['stripeAccountId']) && this.clientSecret) {
      console.log('🔵 StripePaymentComponent: Mounting element...', { 
        secret: this.clientSecret.substring(0, 10) + '...', 
        accountId: this.stripeAccountId 
      });
      
      try {
        await this.stripeService.mountPaymentElement(
          this.clientSecret, 
          'payment-element', 
          this.stripeAccountId
        );
      } catch (err) {
        console.error('🔴 Error mounting PaymentElement:', err);
        this.paymentError.emit('Error cargando pasarela de pago.');
      }
    }
  }

  async confirmPayment() {
    this.isProcessing.set(true);
    try {
      const returnUrl = window.location.origin + '/confirmacion'; 
      const paymentIntent = await this.stripeService.confirmPayment(returnUrl);
      
      if (paymentIntent.status === 'succeeded') {
        this.paymentSuccess.emit(paymentIntent.id);
      } else {
        this.paymentError.emit(`Estado del pago: ${paymentIntent.status}`);
      }
    } catch (error: any) {
      console.error('Error procesando el pago:', error);
      this.paymentError.emit(error.message);
    } finally {
      this.isProcessing.set(false);
    }
  }
}
