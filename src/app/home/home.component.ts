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

  contadorProyectos() {
    this.proyectoService.obtenerTotalDeProyectos().subscribe({
      next: (response: any[]) => {
        console.log('Total de proyectos:', response.length);
        this.totalProyectos = response.length;
      },
      error: (err) => {
        console.error('Error al obtener todos los proyectos', err);
        this.totalProyectos = 0;
      },
    });
    this.contadorPaises();
  }

  contadorPaises() {
    this.userService.obtenerPaises().subscribe({
      next: (response: any[]) => {
        console.log('Total de Paises:', response.length);
        this.totalPaises = response.length;
        this.paises = response;
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
