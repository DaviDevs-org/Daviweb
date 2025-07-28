import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';
import { AuthenticationService } from './authentication.service';

export const routes: Routes = [
    {path:'', component:HomeComponent,},
    {path:'login', component:LoginComponent},
    {path:'admin', component:AdminPanelComponent, canActivate:[AuthenticationService]},
    {path:'**', redirectTo:''}
];
