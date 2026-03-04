import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, doc, docData, updateDoc } from '@angular/fire/firestore';
import { Functions, httpsCallable, getFunctions } from '@angular/fire/functions';
import { getApp } from '@angular/fire/app';
import { Observable, map } from 'rxjs';
import { SaasConfigService } from 'src/app/config/saas-config.service';
import { PaymentRepository } from '@application/payment/payment.repository.interface';

@Injectable({
  providedIn: 'root',
})
export class FirebasePaymentRepository implements PaymentRepository {
  private firestore = inject(Firestore);
  private functions = inject(Functions);
  private injector = inject(Injector);

  private configService = inject(SaasConfigService); 

  getPaymentSettings(): Observable<any> {
    return runInInjectionContext(this.injector, () => {
      // Obtenemos el path dinámicamente en el momento de la ejecución
      // para asegurar que tenemos el tenantId correcto cargado
      const businessPath = this.configService.getAll().id === 'demo' 
         ? this.configService.getDDBBPaths().contactInfo 
         : `hairdressers/${this.configService.getAll().id}`;

      const docRef = doc(this.firestore, businessPath);
      return (docData(docRef) as Observable<any>).pipe(
        map(data => data?.payments || { prePaymentPolicy: 'none', prePaymentValue: 0 })
      );
    });
  }

  async updatePaymentSettings(settings: { prePaymentPolicy: string, prePaymentValue: number }): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const businessPath = this.configService.getAll().id === 'demo' 
         ? this.configService.getDDBBPaths().contactInfo 
         : `hairdressers/${this.configService.getAll().id}`;
         
      const docRef = doc(this.firestore, businessPath);
      await updateDoc(docRef, {
        'payments.prePaymentPolicy': settings.prePaymentPolicy,
        'payments.prePaymentValue': settings.prePaymentValue
      });
    });
  }

  /**
   * DESCONEXIÓN: Borra el rastro de Stripe en el local
   */
  async disconnectStripe(): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const businessPath = this.configService.getAll().id === 'demo' 
         ? this.configService.getDDBBPaths().contactInfo 
         : `hairdressers/${this.configService.getAll().id}`;

      const docRef = doc(this.firestore, businessPath);
      // Ponemos a null los campos para que la UI vuelva al estado de "Conectar"
      await updateDoc(docRef, {
        'payments.stripeAccountId': null,
        'payments.stripeStatus': 'disconnected',
        'payments.prePaymentPolicy': 'none'
      });
    });
  }

  async createPaymentIntent(serviceId: string, tenantId: string, hairLength?: string): Promise<{ clientSecret: string; amount: number; stripeAccountId?: string }> {
    // Forzamos la región a europe-west1 para evitar errores de CORS si la inyección por defecto falla
    const functionsInstance = getFunctions(getApp(), 'europe-west1');
    
    const createPaymentIntentFn = httpsCallable<{ serviceId: string, tenantId: string, hairLength?: string }, { clientSecret: string, amount: number, stripeAccountId?: string }>(
      functionsInstance,
      'createPaymentIntent'
    );
    const result = await createPaymentIntentFn({ serviceId, tenantId, hairLength });
    return result.data;
  }
}