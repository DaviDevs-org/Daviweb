import { Component, inject, Injector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthenticationService } from '@shared/authentication.service';
import { Router } from '@angular/router';
import { AlertService } from '@shared/alert/alert.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private auth = inject(AuthenticationService)
  private router = inject(Router);
  private toast = inject(AlertService);
  private injector = inject(Injector);
  loginData = {
    email: '',
    password: ''
  };

  showPassword = false;
  isLoading = false;

  onSubmit() {
    return runInInjectionContext(this.injector, async () => {
      if (this.loginData.email && this.loginData.password) {
        this.isLoading = true;
        const response = await this.auth.login(this.loginData.email, this.loginData.password);
        if (response.success) {
          this.router.navigate(['admin'])
        }
        else {
          this.toast.error("Email o contraseña incorrectos")
        }
        this.isLoading = false
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onForgotPassword() {
    this.toast.info("Contacte con el administrador para recuperar la contraseña")

  }

}
