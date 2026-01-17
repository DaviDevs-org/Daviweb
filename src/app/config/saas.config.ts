import { TenantConfig } from '../domain/saas/tenant.config';

const defaultId = 'demo';

export const SAAS_CONFIG: TenantConfig = {
  id: defaultId,
  // Configuración de la Empresa
  business: {
    name: "Ro's Pruebas",
    ownerName: 'Rosi',
    instagram: 'ros.peluqueros',
    facebook: 'ros.peluqueros',
    currency: 'EUR',
    currencySymbol: '€',
    opinionsUrl:
      'https://www.google.com/search?client=ubuntu-sn&hs=l6U&sca_esv=f4f4d625b74d76fe&channel=fs&tbm=lcl&sxsrf=AE3TifM_mpB4Ebr-Yc9SHHYNBnaIBQxHOw:1761821391581&q=Ro%27s+Peluqueros+Rese%C3%B1as&rflfq=1&num=20&stick=H4sIAAAAAAAAAONgkxK2MDIytTQ1NDYyMDO2NDExMrcw3MDI-IpRIihfvVghIDWntLA0tSi_WCEotTj18MbE4kWsOKUACtvZTFAAAAA&rldimm=8225951320639442781&hl=es-ES&sa=X&ved=2ahUKEwjWv8-R4MuQAxUEUaQEHZEqAEAQ9fQKegQIRRAF&biw=1600&bih=778&dpr=1.2#lkt=LocalPoiReviews',
  },

  // Configuración Visual (Tema)
  // Estos valores se convertirán en variables CSS automáticamente
  theme: {
    colors: {
      primary: '#e673B4', // Color principal (botones, destacados)
      primaryLight: '#e673B4', // Variación clara (Mismo que primary por defecto en variables.scss)
      primaryLighter: '#fce8ed', // Variación muy clara (fondos, hovers suaves)
      primaryDark: '#d4708f', // Variación oscura
      secondary: '#aca7a3', // Color secundario (textos, fondos neutros)
      accent: '#ef51aA', // Color de acento
      background: '#ffffff', // Fondo principal
      backgroundSecondary: '#f0f4f8', // Fondo secundario (gris muy claro)
      text: '#3d4a56', // Color de texto principal
      border: '#cbd5e0', // Color de bordes por defecto

      // Colores restaurados
      secondaryDark: '#3d4a56',
      secondaryLight: '#8a9ba8',
      backgroundSection: '#e8eff5',
      backgroundCalendar: '#EA76B8',
      backgroundAccent: '#e88fa7',
      borderAccent: '#f5c5d4',
      textPink: '#dc5b7d',
    },
    fonts: {
      main: "'Roboto', sans-serif",
      headings: "'Montserrat', sans-serif",
    },
  },

  // Configuración de Base de Datos (Firebase Collections)
  // Usa estas rutas en tus repositorios para no hardcodear strings
  database: {
    collections: {
      appointments: `/${defaultId}/data/appointments`,
      barberSelection: `/${defaultId}/data/business/barbers`,
      barbers: `/${defaultId}/data/business/barbers/barber`,
      contactInfo: `/${defaultId}/data/business/contactInfo`,
      schedule: `/${defaultId}/data/business/schedule`,
      exceptions: `/${defaultId}/data/business/schedule/exceptions`,
      reservedSlots: `/${defaultId}/data/business/schedule/reservedSlots`,
      services: `/${defaultId}/data/services`,
    },
    storage: {
      general: `/${defaultId}/data/`,
    },
  },

  // Configuración de Funcionalidades (Feature Flags)
  features: {
    enableOnlineBooking: true,
    enableReviews: true,
    enableGallery: true,
    maintenanceMode: false,
    enableSms: true,
  },
};
