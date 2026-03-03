import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, doc, docData, updateDoc } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { SaasConfigService } from 'src/app/config/saas-config.service';
import { PaymentRepository } from '@application/payment/payment.repository.interface';

@Injectable({
  providedIn: 'root',
})
export class FirebasePaymentRepository implements PaymentRepository {
  private firestore = inject(Firestore);
  private injector = inject(Injector);

  private businessPath = inject(SaasConfigService).getDDBBPaths().contactInfo; 

  getPaymentSettings(): Observable<any> {
    return runInInjectionContext(this.injector, () => {
      const docRef = doc(this.firestore, this.businessPath);
      return (docData(docRef) as Observable<any>).pipe(
        map(data => data?.payments || { prePaymentPolicy: 'none', prePaymentValue: 0 })
      );
    });
  }

  async updatePaymentSettings(settings: { prePaymentPolicy: string, prePaymentValue: number }): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const docRef = doc(this.firestore, this.businessPath);
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
      const docRef = doc(this.firestore, this.businessPath);
      // Ponemos a null los campos para que la UI vuelva al estado de "Conectar"
      await updateDoc(docRef, {
        'payments.stripeAccountId': null,
        'payments.stripeStatus': 'disconnected',
        'payments.prePaymentPolicy': 'none'
      });
    });
  }
}