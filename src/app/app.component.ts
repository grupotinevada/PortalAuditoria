import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  ActivatedRoute,
  NavigationEnd,
  NavigationStart,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import {
  MsalService,
  MsalModule,
  MsalBroadcastService,
  MSAL_GUARD_CONFIG,
  MsalGuardConfiguration,
} from '@azure/msal-angular';
import {
  AuthenticationResult,
  InteractionStatus,
  PopupRequest,
  RedirectRequest,
  EventMessage,
  EventType,
} from '@azure/msal-browser';
import { combineLatest, from, Observable, of, Subject } from 'rxjs';
import { filter, last, map, mergeMap, takeUntil } from 'rxjs/operators';
import { UserService } from '../services/user.service';
import { IUsuario } from '../models/user.model';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { BreadcrumbService } from 'src/services/breadcrumb.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [
    CommonModule,
    MsalModule,
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    RouterLink,
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Portal Auditoria';
  isIframe = false;
  loginDisplay = false;
  private readonly _destroying$ = new Subject<void>();
  isDarkMode = false;
  mostrarNavbar = true;
  isSidebarVisible = false;
  breadcrumbs: { label: string; url: string }[] = [];
  constructor(
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    private authService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private breadcrumbService: BreadcrumbService
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.mostrarNavbar = !['/login-failed'].includes(event.url);
      }
    });

    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    this.updateTheme();
  }

  ngOnInit(): void {
    this.authService.handleRedirectObservable().subscribe();

    this.isIframe = window !== window.parent && !window.opener;

    this.authService.instance.enableAccountStorageEvents();
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter(
          (msg: EventMessage) =>
            msg.eventType === EventType.ACCOUNT_ADDED ||
            msg.eventType === EventType.ACCOUNT_REMOVED
        )
      )
      .subscribe((result: EventMessage) => {
        
        if (this.authService.instance.getAllAccounts().length === 0) {
          window.location.pathname = '/';
        } else {
          this.setLoginDisplay();
        }
      });

    this.msalBroadcastService.inProgress$
      .pipe(
        filter(
          (status: InteractionStatus) => status === InteractionStatus.None
        ),
        takeUntil(this._destroying$)
      )
      .subscribe(() => {
        this.setLoginDisplay();
        this.checkAndSetActiveAccount();
      });
    // Iniciar View Transition en NavigationStart
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe(() => {
        if (document.startViewTransition) {
          document.startViewTransition(() => {});
        }
      });
    //breadcrumb
    this.router.events
    .pipe(filter(event => event instanceof NavigationEnd))
    .subscribe(() => {
      this.generateBreadcrumbs(this.route.root).subscribe(breadcrumbs => {
        this.breadcrumbs = breadcrumbs;
      });
    });
  
  }

  setLoginDisplay() {
    this.loginDisplay = this.authService.instance.getAllAccounts().length > 0;
    let accounts = this.authService.instance.getAllAccounts();
    if (accounts.length > 0) {
      const account = accounts[0];
      const usuario: IUsuario = {
        idusuario: account.localAccountId || '',
        nombreUsuario: account.name || '',
        correo: account.username || '',
        idrol: 1,
        habilitado: 1
      };
      this.userService.guardarUsuario(usuario).subscribe((response) => {
        console.log('Usuario Guardado: ', response);
      });
      this.userService
        .obtenerPerfil(usuario.idusuario!, usuario.correo)
        .subscribe((perfilResponse: IUsuario) => {
          usuario.idrol = perfilResponse.idrol;
          usuario.descrol = perfilResponse.descrol;
          sessionStorage.setItem('userData', JSON.stringify(usuario));
          console.log(
            'Usuario Cargado con idPerfil en sessionStorage',
            usuario
          );
        });
    }
  }

  checkAndSetActiveAccount() {
    let activeAccount = this.authService.instance.getActiveAccount();

    if (
      !activeAccount &&
      this.authService.instance.getAllAccounts().length > 0
    ) {
      let accounts = this.authService.instance.getAllAccounts();
      this.authService.instance.setActiveAccount(accounts[0]);
    }
  }

  loginRedirect() {
    if (this.msalGuardConfig.authRequest) {
      this.authService.loginRedirect({
        ...this.msalGuardConfig.authRequest,
      } as RedirectRequest);
    } else {
      this.authService.loginRedirect();
    }
  }

  loginPopup() {
    if (this.msalGuardConfig.authRequest) {
      this.authService
        .loginPopup({ ...this.msalGuardConfig.authRequest } as PopupRequest)
        .subscribe((response: AuthenticationResult) => {
          this.authService.instance.setActiveAccount(response.account);
        });
    } else {
      this.authService
        .loginPopup()
        .subscribe((response: AuthenticationResult) => {
          this.authService.instance.setActiveAccount(response.account);
        });
    }
  }

  logout(popup?: boolean) {
    if (popup) {
      this.authService.logoutPopup({
        mainWindowRedirectUri: '/',
      });
    } else {
      this.authService.logoutRedirect();
    }
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    this.updateTheme();
  }

  updateTheme() {
    const htmlElement = document.documentElement; // Se aplica a <html>
    if (this.isDarkMode) {
      htmlElement.classList.add('dark-theme');
    } else {
      htmlElement.classList.remove('dark-theme');
    }
  }
  toggleSidebar() {
    this.isSidebarVisible = !this.isSidebarVisible;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed', !this.isSidebarVisible);
    }
  }

  goBack(): void {
    this.location.back();
  }

  private generateBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: any[] = []
  ): Observable<any[]> {
    if (route.children.length === 0) return of(breadcrumbs);
  
    return from(route.children).pipe(
      mergeMap(child => {
        const routeConfig = child.routeConfig;
        if (!routeConfig || !routeConfig.path) return of([]);
  
        let nextUrl = `${url}/${routeConfig.path}`;
        Object.keys(child.snapshot.params).forEach(param => {
          nextUrl = nextUrl.replace(`:${param}`, child.snapshot.params[param]);
        });
  
        return this.getBreadcrumbLabel(routeConfig.path, child.snapshot.params).pipe(
          map(label => {
            breadcrumbs.push({ label, url: nextUrl });
            return breadcrumbs;
          }),
          mergeMap(() => this.generateBreadcrumbs(child, nextUrl, breadcrumbs))
        );
      }),
      last()
    );
  }
  
  private getBreadcrumbLabel(path: string, params: any): Observable<string> {
    switch (path) {
      case 'pais':
        return of('Inicio');
      case 'pais/:PaisID':
        return this.breadcrumbService.obtenerNombrePais(params.PaisID).pipe(
          map(nombre => `Inicio > ${nombre}`)
        );
      case 'pais/:PaisID/proyecto/:ProyectoID':
        return combineLatest([
          this.breadcrumbService.obtenerNombrePais(params.PaisID),
          this.breadcrumbService.obtenerNombreProyecto(params.PaisID, params.ProyectoID),
        ]).pipe(
          map(([nombrePais, nombreProyecto]) => `Inicio > ${nombrePais} > ${nombreProyecto}`)
        );
      case 'pais/:PaisID/proyecto/:ProyectoID/sociedad/:SociedadID':
        return combineLatest([
          this.breadcrumbService.obtenerNombrePais(params.PaisID),
          this.breadcrumbService.obtenerNombreProyecto(params.PaisID, params.ProyectoID),
          this.breadcrumbService.obtenerNombreSociedad(params.ProyectoID, params.SociedadID),
        ]).pipe(
          map(([nombrePais, nombreProyecto, nombreSociedad]) => 
            `Inicio > ${nombrePais} > ${nombreProyecto} > ${nombreSociedad}`
          )
        );
      default:
        return of(this.replaceParamsWithValues(path, params));
    }
  }
  private replaceParamsWithValues(path: string, params: any): string {
    return path.replace(/:([a-zA-Z]+)/g, (_, key) => params[key] || key);
  }
  get isHomePage(): boolean {
    return this.router.url === '/';
  }
}
