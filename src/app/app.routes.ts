import { Routes } from '@angular/router';
import { LoginComponent } from './presentation/login/login.component';
import { HomeComponent } from './home/home.component';
import { AdminPanelComponent } from './presentation/admin-panel/admin-panel.component';
import { AuthenticationService } from './services/authentication.service';
import { LegalAdviceComponent } from './presentation/legal/legal-advice/legal-advice.component';
import { PrivacyTermsComponent } from './presentation/legal/privacy-terms/privacy-terms.component';

export const routes: Routes = [
    { path: '', component: HomeComponent, },
    { path: 'login', component: LoginComponent },
    { path: 'admin', component: AdminPanelComponent, canActivate: [AuthenticationService] },
    { path: 'aviso-legal', component: LegalAdviceComponent },
    { path: 'privacidad', component: PrivacyTermsComponent },
    { path: '**', redirectTo: '' }
];
