export interface TenantPaymentConfig {
  stripeAccountId?: string;
  stripeStatus?: 'pending' | 'active' | 'restricted' | 'disconnected';
  prePaymentPolicy: 'none' | 'percentage' | 'fixed' | 'full';
  prePaymentValue: number;
}
