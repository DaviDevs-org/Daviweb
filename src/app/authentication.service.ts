import { inject, Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { ActivatedRouteSnapshot, GuardResult, MaybeAsync, Router, RouterStateSnapshot } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  private cookies = inject(CookieService);
  private router = inject(Router);
  private auth = inject(Auth); // Inyectar Auth en lugar de usar getAuth()
  token: string = "";

  async login(email: string, password: string) {
    try {
      // Usar this.auth en lugar de getAuth()
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const token = await userCredential.user.getIdToken();
      this.token = token;
      this.cookies.set("token", token, {
        expires: 1,
        path: '/',  
        sameSite: 'Lax', 
        secure: false 
      });
      return {
        success: true,
        token: token,
        user: userCredential.user
      };
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error.message);
      return {
        success: false,
        error: error
      };
    }
  }

  getIdToken() {
    return this.cookies.get("token");
  }

  async logOut() {
    try {
      // Usar this.auth y await para manejar la promesa correctamente
      await signOut(this.auth);
      this.token = "";
      this.cookies.delete("token", "/"); // Usar delete en lugar de set con valor vacío
      this.router.navigate(['']);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): MaybeAsync<GuardResult> {
    if (this.getIdToken()) {
      return true;
    } else {
      this.router.navigate(['login']);
      return false;
    }
  }

  // Método adicional útil para verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return !!this.getIdToken() && !!this.auth.currentUser;
  }
}