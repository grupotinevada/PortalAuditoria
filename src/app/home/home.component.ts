/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import {
  AuthenticationResult,
  EventMessage,
  EventType,
  InteractionStatus,
} from '@azure/msal-browser';

import { filter } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AppComponent } from '../app.component';
import { IPais } from 'src/models/pais.model';
import { UserService } from '../../services/user.service';
import { Router, RouterLink } from '@angular/router';
import { ProyectoService } from 'src/services/proyecto.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIcon,
    RouterLink
  ],
})
export class HomeComponent implements OnInit {
  loginDisplay = false;
  tabs: { label: string; content: '' }[] = [];
  paises: IPais[] = [];
  totalProyectos = 0;
  totalPaises = 0;
  mostrarModal = false;
  paisSeleccionado: any = null;
  archivosCargados: any[] = [];

  paisesCargados = false;
  proyectosCargados = false;


  constructor(
    private router: Router,
    private authService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private appComponent: AppComponent,
    private userService: UserService,
    private proyectoService: ProyectoService
  ) {}

  ngOnInit(): void {
    this.cargaEstadoSuccessUsuario();
    this.contadorProyectos();
  }

  cargaEstadoSuccessUsuario() {
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS)
      )
      .subscribe((result: EventMessage) => {
        console.log(result);
        const payload = result.payload as AuthenticationResult;
        this.authService.instance.setActiveAccount(payload.account);
      });

    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None)
      )
      .subscribe(() => {
        this.setLoginDisplay();
      });
  }

  setLoginDisplay() {
    this.loginDisplay = this.authService.instance.getAllAccounts().length > 0;
  }

  loginMicrosoft() {
    this.appComponent.loginRedirect();
  }
  contarProyectosPorPais() {
    
    if (!this.archivosCargados || !this.paises) {
      
      return;
    }
  
   
  
    const conteo: Record<number, number> = {};
  
    this.archivosCargados.forEach((proyecto: any) => {
     
      const id = proyecto.idpais;
      conteo[id] = (conteo[id] || 0) + 1;
     
    });
  
    this.paises = this.paises.map((pais: any) => {
      const cantidad = conteo[pais.idpais] || 0;
    
      return {
        ...pais,
        cantidadProyectos: cantidad,
      };
    });
  
  }
  

  contadorProyectos() {
    this.contadorPaises();
    this.proyectoService.obtenerTotalDeProyectos().subscribe({
      next: (response: any[]) => {

        this.totalProyectos = response.length;
        this.archivosCargados = response;
  
        // Si los países ya están cargados, ahora sí contamos los proyectos por país
        if (this.paises?.length) {
          this.contarProyectosPorPais();
        }
      },
      error: (err) => {
        console.error('Error al obtener todos los proyectos', err);
        this.totalProyectos = 0;
      },
    });
 // sigue siendo llamada
  }

  contadorPaises() {
    this.userService.obtenerPaises().subscribe({
      next: (response: any[]) => {
        console.log('Total de Paises:', response.length);
        this.totalPaises = response.length;
        this.paises = response;
  
        // Si los proyectos ya están cargados, ahora sí contamos los proyectos por país
        if (this.archivosCargados?.length) {
          this.contarProyectosPorPais();
        }
      },
      error: (err) => {
        console.error('Error al obtener todos los Paises', err);
        this.totalPaises = 0;
      },
    });
  }

  abrirModal() {
    this.mostrarModal = true;
  }
  
  cerrarModal() {
    this.mostrarModal = false;
  }

  seleccionarPais(pais: any) {
    this.paisSeleccionado = pais;
    console.log('País seleccionado:', pais);
    this.cerrarModal();
    this.router.navigate(['/pais', pais.idpais]);
  }

}
