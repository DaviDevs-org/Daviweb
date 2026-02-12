import { inject, Injectable } from '@angular/core';
import {
  Auth,
  authState,
  signInWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth';
import { ActivatedRouteSnapshot, GuardResult, MaybeAsync, Router, RouterStateSnapshot } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { TenantService } from '../../config/tenant.service';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  private cookies = inject(CookieService);
  private router = inject(Router);
  private auth = inject(Auth); // Inyectar Auth en lugar de usar getAuth()
  private tenantService = inject(TenantService);
  token: string = "";

  async login(email: string, password: string) {
    try {
      // Usar this.auth en lugar de getAuth()
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      // 🛑 SEGURIDAD MULTI-TENANT ESTRICTA (SOLO OWNERS)
      // Obtenemos los claims del usuario para verificar si pertenece a esta peluquería
      const tokenResult = await userCredential.user.getIdTokenResult();
      const claims = tokenResult.claims;
      const currentTenantId = this.tenantService.getTenantConfig().id;

      // 1. Verificar si es OWNER
      if (claims['role'] !== 'owner') {
        console.warn(`Intento de acceso denegado: Usuario ${userCredential.user.uid} sin rol de owner.`);
        await signOut(this.auth);
        return {
          success: false,
          error: { message: 'Acceso restringido a administradores.' }
        };
      }

      // 2. Verificar si es OWNER de ESTA peluquería
      if (claims['tenantId'] !== currentTenantId) {
        console.warn(`Intento de acceso cruzado: Owner de ${claims['tenantId']} intentando entrar en ${currentTenantId}`);
        await signOut(this.auth);
        return {
          success: false,
          error: { message: 'No tienes permisos para administrar esta peluquería.' }
        };
      }

      const token = tokenResult.token;
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
      console.error("Error al iniciar sesión:", error.code);
      
      let message = 'Error desconocido al iniciar sesión.';

      switch (error.code) {
        case 'auth/invalid-email':
          message = 'El correo electrónico no tiene un formato válido.';
          break;
        case 'auth/user-disabled':
          message = 'Este usuario ha sido deshabilitado.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Correo electrónico o contraseña incorrectos.';
          break;
        case 'auth/too-many-requests':
          message = 'Demasiados intentos fallidos. Inténtalo más tarde.';
          break;
        case 'auth/network-request-failed':
          message = 'Error de conexión. Comprueba tu internet.';
          break;
        default:
          message = 'Ocurrió un error inesperado. Inténtalo de nuevo.';
      }

      return {
        success: false,
        error: { message }
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

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<GuardResult> {
    try {
      const user = await firstValueFrom(authState(this.auth).pipe(take(1)));

      if (!user) {
        this.router.navigate(['login']);
        return false;
      }

      const tokenResult = await user.getIdTokenResult();
      const claims = tokenResult.claims;
      const currentTenantId = this.tenantService.getTenantConfig().id;

      const isOwner = claims['role'] === 'owner';
      const isSameTenant = claims['tenantId'] === currentTenantId;

      if (!isOwner || !isSameTenant) {
        await signOut(this.auth);
        this.cookies.delete('token', '/');
        this.router.navigate(['login']);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating admin access:', error);
      this.router.navigate(['login']);
      return false;
    }
  }

  // Método adicional útil para verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return !!this.getIdToken() && !!this.auth.currentUser;
  }
}