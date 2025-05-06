/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import Swal from 'sweetalert2';
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
import { Subject } from 'rxjs';
import { filter, takeUntil, take } from 'rxjs/operators';
import { UserService } from '../services/user.service';
import { IUsuario } from '../models/user.model';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { ReactiveFormsModule } from '@angular/forms';
import { CrearProyectoComponent } from './crear-proyecto/crear-proyecto.component';
import { BreadcrumbService } from 'src/services/breadcrumb.service';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { CrearProcesoComponent } from './crear-proceso/crear-proceso.component';
import { ProyectoEventoService } from 'src/services/proyecto-evento.service';
import { CrearUsuarioComponent } from './crear-usuario/crear-usuario.component';
import { ProyectoService } from 'src/services/proyecto.service';

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
    ReactiveFormsModule,
    CrearProyectoComponent,
    BreadcrumbComponent,
    CrearProcesoComponent,
    CrearUsuarioComponent
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  mostrarModalProyecto = false;
  mostrarModalProceso = false;
  mostrarModalUsuario = false;
  botonCrearUsuario = false;
  title = 'Portal Auditoria';
  isIframe = false;
  loginDisplay = false;
  isLoading = true;
  private readonly _destroying$ = new Subject<void>();
  isDarkMode = false;
  mostrarNavbar = true;
  isSidebarVisible = false;
  mostrarFondoNegro = false;
  profile: IUsuario | null = null;
  isAdmin = false;
  proyectoHabilitado = false;

  constructor(
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    private authService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private breadcrumbService: BreadcrumbService,
    private proyectoEventoService: ProyectoEventoService,
    private modalService: ProyectoEventoService,
    private proyectoService : ProyectoService
  ) {

    this.verificarProyecto();

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.mostrarNavbar = !['/login-failed'].includes(event.url);
      }
    });
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Evalúa la ruta actual
        const url = event.urlAfterRedirects.split('?')[0];
        this.botonCrearUsuario = /^\/administracion\/?$/.test(url);
      }
    });
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.verificarProyecto();
      }
    });

    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    this.updateTheme();

    //modal proceso
    this.modalService.mostrarModalCrearProceso$.subscribe(
      (mostrar) => (this.mostrarModalProceso = mostrar)
    );

    this.modalService.mostrarModalCrearUsuario$.subscribe(
      (mostrar) => {
        this.mostrarModalUsuario = mostrar;
        console.log('Modal usuario state updated:', mostrar);
      }
    );
  
  }

  ngOnInit(): void {
    this.authService.handleRedirectObservable().subscribe({
      next: (result) => {
        if (result?.account) {
          const account = result.account;
          const usuarioId = account.localAccountId;
          const correo = account.username;

          // Validar que el usuario esté registrado y habilitado
          this.userService.obtenerPerfil(usuarioId, correo).subscribe({
            next: (perfil) => {
              if (!perfil) {
                this.showErrorAlert(
                  'No autorizado',
                  'Este correo no está registrado o no tiene acceso.',
                  ' Por favor contacta con el administrador.'
                );
                return;
              }

              if (!perfil.habilitado) {
                console.log('Usuario deshabilitado:', perfil);
                this.showErrorAlert(
                  'No autorizado',
                  'Tu cuenta está deshabilitada',
                  'Por favor contacta con el administrador.'
                );
                return;
              }

              // Usuario autorizado: establecer cuenta activa y mostrar login
              this.authService.instance.setActiveAccount(account);
              this.setLoginDisplay(); // ✅ SOLO aquí se llama
            },
            error: (err) => {
              console.error('Error al obtener perfil del usuario:', err);
              this.showErrorAlert(
                'No autorizado',
                'NO TIENES PERMISOS PARA ACCEDER A ESTA APLICACION.',
                'Por favor contacta con el administrador.'
              );
            },
          });
        }
      },
      error: (err) => {
        console.error('Error en el proceso de redirección:', err);
      },
    });

    // se inicializan otros estados
    this.isIframe = window !== window.parent && !window.opener;
    this.authService.instance.enableAccountStorageEvents();

    // se verifican los estados iniciales de autenticacion ( aun no guarda al usuario)
    this.checkInitialAuthState();
    this.profile = this.userService.getProfile();
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter(
          (msg: EventMessage) =>
            msg.eventType === EventType.ACCOUNT_ADDED ||
            msg.eventType === EventType.ACCOUNT_REMOVED
        ),
        takeUntil(this._destroying$)
      )
      .subscribe(() => {
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
        this.checkAndSetActiveAccount();
        this.isLoading = false;
      });

    this.msalBroadcastService.inProgress$.pipe(take(1)).subscribe((status) => {
      if (status === InteractionStatus.None) {
        this.isLoading = false;
      }
    });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe(() => {
        if (document.startViewTransition) {
          document.startViewTransition(() => {
            const mainContent = document.querySelector('main');
            if (mainContent) {
              mainContent.classList.add('fade-out');
              setTimeout(() => {
                mainContent.classList.remove('fade-out');
                mainContent.classList.add('fade-in');
              }, 300);
            }
          });
        }
      });
  }

  private showErrorAlert(title: string, text: string, footer: string): void {
    Swal.fire({
      title,
      text,
      footer,
      icon: 'warning',
      confirmButtonText: 'Cerrar sesión',
      backdrop: true,
      allowOutsideClick: false,
      showCancelButton: false,
      allowEscapeKey: false,
      willOpen: () => {
        this.showBackdrop();
      },
    }).then(() => {
      this.authService.logout().subscribe({
        complete: () => {
          // Redirige obligatoriamente 
          this.hideBackdrop();
          this.router.navigateByUrl('/');
        },
      });
    });
  }

  private checkInitialAuthState() {
    const accounts = this.authService.instance.getAllAccounts();
    if (accounts.length > 0) {
      this.setLoginDisplay();
      this.profile = this.userService.getProfile(); 
      this.isLoading = false;
    } else {
      this.isLoading = false;
    }
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
        habilitado: 1,
        // La foto se establecerá después
      };

      // Primero intenta obtener la foto de perfil
      this.userService
        .obtenerFotoPerfil(account.name || '', account.localAccountId || '')
        .then((fotoUrl) => {
          usuario.fotoPerfil = fotoUrl;

          // Luego obtén el resto del perfil
          this.userService
            .obtenerPerfil(usuario.idusuario!, usuario.correo)
            .subscribe({
              next: (perfilResponse) => {
                if (perfilResponse) {
                  usuario.idrol = perfilResponse.idrol;
                  usuario.descrol = perfilResponse.descrol;
                  sessionStorage.setItem('userData', JSON.stringify(usuario));
                  console.log('Usuario ya existe, perfil cargado', usuario);
                } else {
                  // Usuario no existe, no guardar
                  console.warn('Usuario no existe, no se guardará en la BD');
                }
              },
              error: (err) => {
                console.error(
                  'Error al verificar existencia del usuario:',
                  err
                );
              },
            });
        });
    }
    this.profile = this.userService.getProfile();
  }

verificarProyecto(): void {
    const match = this.router.url.match(/\/proyecto\/(\d+)/);
    const idProyecto = match ? +match[1] : null;

    if (idProyecto) {
      this.proyectoService.obtenerProyectoPorIdProyecto(idProyecto).subscribe({
        next: (proyecto) => {
          this.proyectoHabilitado = proyecto.habilitado === 1;
          console.log('proyecto id:', proyecto.idproyecto, proyecto.nombreproyecto, proyecto.habilitado)
        },
        error: (err) => {
          console.error('Error al obtener el proyecto:', err);
          this.proyectoHabilitado = false;
        }
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

  get isHomePage(): boolean {
    return this.router.url === '/';
  }

  get showNewProjectButton(): boolean {
    // Verifica si la ruta actual coincide con /pais/:id
    const urlRegex = /^\/pais\/\d+$/;
    return urlRegex.test(this.router.url);
  }

  get showNewProcessButton(): boolean {
    const urlRegex = /^\/pais\/\d+\/proyecto\/\d+\/sociedad\/\d+$/;
    return urlRegex.test(this.router.url) && this.proyectoHabilitado;
  }


  paisId: number | null = null;

  abrirModalCrearProyecto(): void {
    console.log('Función abrirModalCrearProyecto ejecutada');
    const match = this.router.url.match(/^\/pais\/(\d+)$/);
    console.log('Match de URL:', match);

    if (match && match[1]) {
      this.paisId = parseInt(match[1], 10);
      console.log('ID de país obtenido:', this.paisId);
      this.mostrarModalProyecto = true;
      console.log('Modal debería estar visible ahora');
    } else {
      console.warn('No se pudo extraer el ID del país de la URL');
    }
  }

  cerrarModalProyecto(): void {
    this.ngOnInit();
    this.mostrarModalProyecto = false;
  }

  onProyectoCreado(proyecto: any): void {
    console.log('Proyecto creado:', proyecto);
    // Aquí puedes agregar lógica adicional si necesitas
    this.proyectoEventoService.emitirProyectoCreado(proyecto);
    this.cerrarModalProyecto();
  }

  //procesos

  abrirModalCrearProceso(): void {
    
    this.modalService.abrirCrearProceso();

  }

  abrirModalCrearUsuario(): void {
    this.modalService.abrirCrearUsuario();
  }

  onUsuarioCreado(usuario: any) {
    console.log('Usuario creado:', usuario);
    // Aquí puedes hacer lo que necesites con el usuario creado
  }

  showBackdrop() {
    const backdrop = document.getElementById('backdrop');
    if (backdrop) backdrop.style.display = 'block';
  }

  hideBackdrop() {
    const backdrop = document.getElementById('backdrop');
    if (backdrop) backdrop.style.display = 'none';
  }


}
