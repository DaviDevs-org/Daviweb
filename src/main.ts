import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { MAT_DATE_LOCALE } from '@angular/material/core';

registerLocaleData(localeEs);

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },  // <--- así se hace aquí
    { provide: LOCALE_ID, useValue: 'es-ES' }
  ]
}).catch((err) => console.error(err));
