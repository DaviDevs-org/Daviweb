const userId = 'ddbbchanges';
export const SAAS_CONFIG = {
  // Configuración de la Empresa
  business: {
    name: 'Nombre de tu Negocio',
    email: 'contacto@negocio.com',
    phone: '+34 600 000 000',
    address: 'Calle Ejemplo, 123, Madrid',
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
