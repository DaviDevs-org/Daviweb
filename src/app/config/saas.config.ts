const userId = 'ddbbchanges';
export const SAAS_CONFIG = {
  // Configuración de la Empresa
  business: {
    name: "Ro's Pruebas",
    ownerName: 'Rosi',
    instagram: 'ros.peluqueros',
    facebook: 'ros.peluqueros',
    currency: 'EUR',
    currencySymbol: '€',
  },

  // Configuración Visual (Tema)
  // Estos valores se convertirán en variables CSS automáticamente
  theme: {
    colors: {
      primary: '#e673B4',        // Color principal (botones, destacados)
      primaryLight: '#e673B4',   // Variación clara (Mismo que primary por defecto en variables.scss)
      primaryLighter: '#fce8ed', // Variación muy clara (fondos, hovers suaves)
      primaryDark: '#d4708f',    // Variación oscura
      secondary: '#aca7a3',      // Color secundario (textos, fondos neutros)
      accent: '#ef51aA',         // Color de acento
      background: '#ffffff',     // Fondo principal
      backgroundSecondary: '#f0f4f8', // Fondo secundario (gris muy claro)
      text: '#3d4a56',           // Color de texto principal
      border: '#cbd5e0',         // Color de bordes por defecto
      
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
    }
  },

  // Configuración de Base de Datos (Firebase Collections)
  // Usa estas rutas en tus repositorios para no hardcodear strings
  database: {
    collections: {
      appointments: `/${userId}/data/appointments`,
      barberSelection: `/${userId}/data/business/barbers`,
      barbers: `/${userId}/data/business/barbers/barber`,
      contactInfo: `/${userId}/data/business/contactInfo`,
      schedule: `/${userId}/data/business/schedule`,
      exceptions: `/${userId}/data/business/schedule/exceptions`,
      reservedSlots: `/${userId}/data/business/schedule/reservedSlots`,
      services: `/${userId}/data/services`,
    },
    storage: {
      general: `/${userId}/data/`
    }
  },

  // Configuración de Funcionalidades (Feature Flags)
  features: {
    enableOnlineBooking: true,
    enableReviews: true,
    enableGallery: true,
    maintenanceMode: false
  }
};

export type SaasConfig = typeof SAAS_CONFIG;
