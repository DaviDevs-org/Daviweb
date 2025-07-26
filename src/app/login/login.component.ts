import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginData = {
    email: '',
    password: ''
  };

  showPassword = false;
  isLoading = false;

  onSubmit() {
    if (this.loginData.email && this.loginData.password) {
      this.isLoading = true;
      
      // Simular llamada al backend
      setTimeout(() => {
        console.log('Login attempt:', this.loginData);
        this.isLoading = false;
        // Aquí implementarías la lógica real de autenticación
      }, 2000);
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onForgotPassword() {
    console.log('Recuperar contraseña');
    // Implementar lógica de recuperación de contraseña
  }
}