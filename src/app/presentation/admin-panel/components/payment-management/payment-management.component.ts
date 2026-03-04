import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  getFunctions,
  httpsCallable,
} from '@angular/fire/functions';
import { FirebaseApp } from '@angular/fire/app';
import { ActivatedRoute } from '@angular/router';

//Application layer
import { GetPaymentSettingsUseCase } from '@application/payment/get-payment-settings.use-case';
import { UpdatePaymentSettingsUseCase } from '@application/payment/update-payment-settings.use-case';
import { DisconnectStripeUseCase } from '@application/payment/disconnect-stripe.use-case';

import { TenantService } from '../../../../config/tenant.service';

@Component({
  selector: 'app-payment-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-management.component.html',
  styleUrls: ['./payment-management.component.scss'],
})
export class PaymentManagementComponent implements OnInit {
  private app = inject(FirebaseApp);
  private functions = getFunctions(this.app, 'europe-west1');
  private tenantService = inject(TenantService);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  proccessing = signal(false);
  saving = signal(false);

  // Policy configuration signals
  policy = signal<'none' | 'fixed' | 'percentage' | 'full'>('none');
  prePaymentValue = signal<number>(0);

  // Computed signal to get Stripe status from Tenant config
  stripeAccountId = computed(
    () => this.tenantService.tenant()?.payments?.stripeAccountId,
  );
  stripeStatus = computed(
    () => this.tenantService.tenant()?.payments?.stripeStatus,
  );

  isConnected = computed(() => this.stripeStatus() === 'active');

  constructor(
    private readonly getSettingsUC: GetPaymentSettingsUseCase,
    private readonly updateSettingsUC: UpdatePaymentSettingsUseCase,
    private readonly disconnectStripeUC: DisconnectStripeUseCase,
  ) {
    // Sync local state with tenant config when it changes
    effect(
      () => {
        const tenant = this.tenantService.tenant();
        if (tenant?.payments) {
          this.policy.set(tenant.payments.prePaymentPolicy || 'none');
          this.prePaymentValue.set(tenant.payments.prePaymentValue || 0);
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['status'] === 'success' || params['status'] === 'retry') {
        this.checkStatus();
      }
    });

    // Check status on load if we have an account ID but status is not active
    if (this.stripeAccountId() && !this.isConnected()) {
      this.checkStatus();
    }
  }

  async saveConfig(event: Event) {
    event.preventDefault();
    if (this.saving()) return;

    this.saving.set(true);
    try {
      await this.updateSettingsUC.execute({
        prePaymentPolicy: this.policy(),
        prePaymentValue: this.prePaymentValue(),
      });

      alert('✅ Configuración de pagos guardada correctamente.');
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('❌ Error al guardar la configuración.');
    } finally {
      this.saving.set(false);
    }
  }

  async disconnect() {
    const confirm = window.confirm(
      '¿Estás seguro? Se borrará la vinculación con Stripe y no podrás recibir cobros.',
    );
    if (!confirm) return;

    this.saving.set(true);
    try {
      await this.disconnectStripeUC.execute();
      alert('Cuenta desvinculada con éxito.');
      // El TenantService debería actualizarse automáticamente si el repo emite cambios
    } catch (error) {
      console.error('Error al desvincular:', error);
    } finally {
      this.saving.set(false);
    }
  }

  async connectStripe() {
    this.proccessing.set(true);
    try {
      const createConnectAccount = httpsCallable(
        this.functions,
        'createConnectAccount',
      );
      const tenantId = this.tenantService.tenant()?.id;
      if (!tenantId) return;

      const result = (await createConnectAccount({ tenantId })) as any;
      if (result.data.url) window.location.href = result.data.url;
    } catch (error) {
      console.error('Error al conectar:', error);
    } finally {
      this.proccessing.set(false);
    }
  }

  async checkStatus() {
    if (this.loading()) return;
    this.loading.set(true);

    try {
      const checkStripeAccountStatus = httpsCallable(
        this.functions,
        'checkStripeAccountStatus',
      );
      const tenantId = this.tenantService.tenant()?.id;

      if (!tenantId) return;

      const result = (await checkStripeAccountStatus({ tenantId })) as any;
      const newStatus = result.data.status;

      // Update local tenant state
      const currentTenant = this.tenantService.tenant();
      if (currentTenant) {
        const currentPayments = currentTenant.payments || {
          prePaymentPolicy: 'none',
          prePaymentValue: 0,
          stripeAccountId: undefined,
          stripeStatus: 'pending',
        };

        this.tenantService.tenant.set({
          ...currentTenant,
          payments: {
            ...currentPayments,
            stripeStatus: newStatus,
          },
        });
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    } finally {
      this.loading.set(false);
    }
  }
}
