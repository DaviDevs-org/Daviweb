import { inject, Injectable } from '@angular/core';
import { getAuth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { ActivatedRouteSnapshot, GuardResult, MaybeAsync, Router, RouterStateSnapshot } from '@angular/router';
import {CookieService} from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  constructor() { }
  private cookies = inject(CookieService)
  private router = inject(Router)
  token:string = "";

    async login(email: string, password: string) {
    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      this.token = token;
      this.cookies.set("token", token, {
        expires: 1,
        path: '/',  
        sameSite: 'Lax', 
        secure: false 
      })
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

  getIdToken(){
    return this.cookies.get("token")
  }
  logOut(){
    getAuth().signOut().then(()=>{
      this.token="";
      this.cookies.set("token", this.token, {
        expires: 1,
        path: '/',  
        sameSite: 'Lax', 
        secure: false 
      })
      window.location.reload()
      
    })
  }
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): MaybeAsync<GuardResult> {
        if (this.getIdToken()){
            return true
        }
        else{
            this.router.navigate(['login'])
            return false
        }
    }
}
