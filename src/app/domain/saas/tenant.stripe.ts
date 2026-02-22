export interface TenantPaymentConfig {
  stripeAccountId?: string;
  stripeStatus?: 'pending' | 'active' | 'restricted';
  prePaymentPolicy: 'none' | 'percentage' | 'fixed';
  prePaymentValue: number;
}
