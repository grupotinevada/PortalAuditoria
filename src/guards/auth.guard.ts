/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { UserService } from '../services/user.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: MsalService,
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const accounts = this.authService.instance.getAllAccounts();
  
    if (accounts.length === 0) {
      this.router.navigate(['/login-failed']);
      return of(false);
    }
  
    const account = accounts[0];
    const localAccountId = account.localAccountId || '';
    const username = account.username || '';
  
    return this.userService.obtenerPerfil(localAccountId, username).pipe(
      map(usuario => {
        if (!usuario) {
          console.warn('[AuthGuard] Usuario no encontrado en base de datos.');
          this.authService.logout();
          this.router.navigate(['/login-failed']);
          return false;
        }
  
        const coincideId = usuario.idusuario === localAccountId;
        const coincideCorreo = usuario.correo === username;
  
        if (coincideId && coincideCorreo && usuario.habilitado == 1) {
          console.log('✅ Usuario habilitado y autenticado correctamente');
          return true;
        }
  
        console.warn('[AuthGuard] Usuario no habilitado o datos no coinciden.');
        this.authService.logout();
        this.router.navigate(['/login-failed']);
        return false;
      }),
      catchError((error) => {
        console.error('[AuthGuard] Error al obtener perfil del usuario:', error);
        this.authService.logout();
        this.router.navigate(['/login-failed']);
        return of(false);
      })
    );
  }
  
}
