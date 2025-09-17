import { Component, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthenticationService } from '../services/authentication.service';
import { Router } from '@angular/router';
import { Firestore} from '@angular/fire/firestore';
import { AlertService } from '../services/alert/alert.service';

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
  private firestore = inject(Firestore);
  private toast = inject(AlertService);
  loginData = {
    email: '',
    password: ''
  };

  showPassword = false;
  isLoading = false;

  async onSubmit() {
    if (this.loginData.email && this.loginData.password) {
      this.isLoading = true;
      const response = await this.auth.login(this.loginData.email, this.loginData.password);
      if (response.success){
        this.router.navigate(['admin'])
      }
      else{
        console.log(response.error)
        this.toast.error(response.error)
      }
      this.isLoading = false
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onForgotPassword() {
    console.log('Recuperar contraseña');

  }

}
