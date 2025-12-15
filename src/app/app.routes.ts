import { Routes } from '@angular/router';
import { AuthenticationService } from './presentation/shared/authentication.service';

export const routes: Routes = [
    { 
        path: '', 
        loadComponent: () => import('./presentation/home/home.component').then(m => m.HomeComponent) 
    },
    { 
        path: 'login', 
        loadComponent: () => import('./presentation/login/login.component').then(m => m.LoginComponent) 
    },
    { 
        path: 'admin', 
        loadComponent: () => import('./presentation/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent),
        canActivate: [AuthenticationService] 
    },
    { 
        path: 'aviso-legal', 
        loadComponent: () => import('./presentation/legal/legal-advice/legal-advice.component').then(m => m.LegalAdviceComponent) 
    },
    { 
        path: 'politica-privacidad', 
        loadComponent: () => import('./presentation/legal/privacy-terms/privacy-terms.component').then(m => m.PrivacyTermsComponent) 
    },
    { path: '**', redirectTo: '' }
];
