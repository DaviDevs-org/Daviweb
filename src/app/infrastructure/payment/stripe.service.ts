import { Injectable, signal } from '@angular/core';
import { Appearance, loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private stripePromise: Promise<Stripe | null>;
  private elements: StripeElements | null = null;
  private currentStripeAccount: string | null = null;

  public isReady = signal(false);

  constructor() {
    this.stripePromise = loadStripe(environment.stripePublicKey);
  }

  // Permite obtener una instancia de Stripe específica para una cuenta conectada
  async getStripeInstance(connectedAccountId?: string): Promise<Stripe | null> {
    console.log('Getting Stripe Instance for:', connectedAccountId || 'Platform');
    
    // Si se solicita una cuenta específica y es diferente a la actual (o si no teníamos ninguna)
    if (connectedAccountId && connectedAccountId !== this.currentStripeAccount) {
      console.log('Switching Stripe Account to:', connectedAccountId);
      this.currentStripeAccount = connectedAccountId;
      this.stripePromise = loadStripe(environment.stripePublicKey, {
        stripeAccount: connectedAccountId
      });
    } 
    // Si NO se solicita cuenta (undefined) pero tenemos una cuenta cargada, volver a Platform
    else if (!connectedAccountId && this.currentStripeAccount) {
      console.log('Reverting Stripe to Platform Account');
      this.currentStripeAccount = null;
      this.stripePromise = loadStripe(environment.stripePublicKey);
    }

    const stripe = await this.stripePromise;
    if (stripe) this.isReady.set(true);
    return stripe;
  }

  async initStripe() {
    return this.stripePromise;
  }

  // Se monta el Payment Element en el contenedor especificado
  async mountPaymentElement(clientSecret: string, containerId: string, connectedAccountId?: string, theme: Appearance['theme'] = 'stripe') {
    const stripe = await this.getStripeInstance(connectedAccountId);
    if (!stripe) return;

    const appearance: Appearance = { theme };
    this.elements = stripe.elements({ clientSecret, appearance });

    const paymentElement = this.elements.create('payment');
    paymentElement.mount('#' + containerId);
    return paymentElement;
  }

  async confirmPayment(returnUrl: string) {
    const stripe = await this.stripePromise;
    if (!stripe || !this.elements) throw new Error('Stripe not initialized');

    const result = await stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: returnUrl
      },
      redirect: 'if_required' 
    });

    if (result.error) {
      throw result.error;
    }

    return result.paymentIntent;
  }
}
