import { Injectable, Inject, PLATFORM_ID, makeStateKey, TransferState } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { TenantConfig } from '../domain/saas/tenant.config';
import { SAAS_CONFIG } from './saas.config'; // Fallback/Initial config

const TENANT_CONFIG_KEY = makeStateKey<TenantConfig>('tenant.config');

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private tenantConfig: TenantConfig | null = null;
  private readonly DEFAULT_TENANT_ID = 'demo';

  // Manual mapping for custom domains: subdomain/SLD -> tenantId
  // Example: 'midominio' maps 'midominio.com', 'midominio.es', 'www.midominio.com' to 'tenant-id-real'
  private readonly TENANT_MAPPING: Record<string, string> = {
    'midominio': 'tenant-id-real',
    'otrocliente': 'otro-tenant-id',
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private document: Document,
    private firestore: Firestore,
    private transferState: TransferState
  ) {}

  async load(): Promise<void> {
    // 0. Check TransferState (Hydration optimization)
    if (this.transferState.hasKey(TENANT_CONFIG_KEY)) {
      console.log('[TenantService] Config restored from TransferState');
      this.tenantConfig = this.transferState.get(TENANT_CONFIG_KEY, null);
      return;
    }

    const tenantId = this.resolveTenantId();
    console.log(`[TenantService] Resolving tenant: ${tenantId}`);

    try {
      // 1. Try to fetch config from Firestore
      // Path: /{tenantId}/config (Collection: {tenantId}, Document: 'config')
      const configDoc = await getDoc(doc(this.firestore, 'hairdressers', tenantId));
      
      if (configDoc.exists()) {
        console.log(`[TenantService] Config found for ${tenantId}`);
        const data = configDoc.data();
        
        // Merge with default config to ensure all properties exist (deep merge would be better, but shallow for now)
        // We prioritize DB data, but keep structure of SAAS_CONFIG for missing fields if any.
        // Note: This is a simple merge. For nested objects like 'theme', you might want a deeper merge if DB only has partials.
        
        this.tenantConfig = { 
          ...this.createConfigFromDefault(tenantId), // Start with defaults
          ...data, // Override with DB data
          id: tenantId // Ensure ID is correct
        } as TenantConfig;

        // Ensure database paths are set correctly based on ID, even if config comes from DB
        // We force the database paths to follow the convention unless we want to allow DB to override them completely.
        // For now, let's enforce the convention to be safe.
        this.tenantConfig.database = this.generateDatabasePaths(tenantId);
      } else {
        // Fallback to local config but with dynamic ID
        console.warn(`[TenantService] Config for ${tenantId} not found in Firestore. Using default config with dynamic ID.`);
        this.tenantConfig = this.createConfigFromDefault(tenantId);
      }
    } catch (error) {
      console.error('[TenantService] Error loading tenant config', error);
      // Fallback on error
      this.tenantConfig = this.createConfigFromDefault(tenantId);
    }

    // Save to TransferState for client hydration
    if (this.tenantConfig) {
      this.transferState.set(TENANT_CONFIG_KEY, this.tenantConfig);
    }
  }

  getTenantConfig(): TenantConfig {
    if (!this.tenantConfig) {
      throw new Error('Tenant configuration not loaded. Ensure TenantService.load() is called during app initialization.');
    }
    return this.tenantConfig;
  }

  private resolveTenantId(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return this.DEFAULT_TENANT_ID; // SSR fallback
    }

    let hostname = this.document.location.hostname;
    
    // Localhost or IP -> Default Tenant
    if (hostname.includes('localhost') || hostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
      return this.DEFAULT_TENANT_ID;
    }

    // Remove 'www.' to normalize (e.g. www.midominio.com -> midominio.com)
    hostname = hostname.replace(/^www\./, '');

    // Subdomain/SLD resolution (e.g., tenant.domain.com -> tenant)
    const parts = hostname.split('.');
    let tenantId = parts.length > 1 ? parts[0] : this.DEFAULT_TENANT_ID;

    // Check Manual Mapping (override resolved ID)
    if (this.TENANT_MAPPING[tenantId]) {
      console.log(`[TenantService] Mapped ID ${tenantId} to ${this.TENANT_MAPPING[tenantId]}`);
      return this.TENANT_MAPPING[tenantId];
    }

    return tenantId;
  }

  private createConfigFromDefault(tenantId: string): TenantConfig {
    // Clone the default config
    const config = JSON.parse(JSON.stringify(SAAS_CONFIG));
    
    // Override ID and Database Paths
    return {
      ...config,
      id: tenantId,
      database: this.generateDatabasePaths(tenantId)
    };
  }

  private generateDatabasePaths(tenantId: string) {
    return {
      collections: {
        appointments: `hairdressers/${tenantId}/appointments`,
        barberSelection: `hairdressers/${tenantId}/business/barbers`,
        barbers: `hairdressers/${tenantId}/business/barbers/barber`,
        contactInfo: `hairdressers/${tenantId}/business/contactInfo`,
        schedule: `hairdressers/${tenantId}/business/schedule`,
        exceptions: `hairdressers/${tenantId}/business/schedule/exceptions`,
        reservedSlots: `/hairdressers/${tenantId}/business/schedule/reservedSlots`,
        services: `/hairdressers/${tenantId}/services`,
      },
      storage: {
        general: `/hairdressers/${tenantId}/`
      }
    };
  }
}
