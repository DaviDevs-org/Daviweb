import { TenantPaymentConfig } from './tenant.stripe';

export interface TenantBusinessConfig {
  name: string;
  ownerName: string;
  instagram: string;
  facebook: string;
  currency: string;
  currencySymbol: string;
  opinionsUrl: string;
}

export interface TenantThemeColors {
  primary: string;
  primaryLight: string;
  primaryLighter: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundSecondary: string;
  text: string;
  border: string;
  secondaryDark: string;
  secondaryLight: string;
  backgroundSection: string;
  backgroundCalendar: string;
  backgroundAccent: string;
  borderAccent: string;
  textPink: string;
}

export interface TenantThemeFonts {
  main: string;
  headings: string;
}

export interface TenantThemeConfig {
  colors: TenantThemeColors;
  fonts: TenantThemeFonts;
}

export interface TenantDatabaseCollections {
  appointments: string;
  barberSelection: string;
  barbers: string;
  contactInfo: string;
  schedule: string;
  exceptions: string;
  reservedSlots: string;
  services: string;
  [key: string]: string; // Allow for extension
}

export interface TenantDatabaseStorage {
  general: string;
  [key: string]: string;
}

export interface TenantDatabaseConfig {
  collections: TenantDatabaseCollections;
  storage: TenantDatabaseStorage;
}

export interface TenantFeaturesConfig {
  enableOnlineBooking: boolean;
  enableReviews: boolean;
  enableGallery: boolean;
  maintenanceMode: boolean;
  enableSms: boolean;
  enableStripe: boolean;
  enablePrices: boolean;
}

export interface TenantConfig {
  id: string;
  business: TenantBusinessConfig;
  theme: TenantThemeConfig;
  database: TenantDatabaseConfig;
  features: TenantFeaturesConfig;
  payments?: TenantPaymentConfig;
}
