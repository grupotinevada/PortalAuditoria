import { Component, OnInit, AfterViewInit  } from '@angular/core';
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
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    imports: [CommonModule, MatCardModule, MatTabsModule, MatButtonModule, MatIcon ]
})
export class HomeComponent implements OnInit, AfterViewInit{
  loginDisplay = false;
  tabs: { label: string; content: '' }[] = [];
  paises: IPais[] = []
  constructor(
    private router: Router,
    private authService: MsalService,
    private msalBroadcastService: MsalBroadcastService, 
    private appComponent: AppComponent,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.cargaEstadoSuccessUsuario()
    
  }

  ngAfterViewInit(): void {
    this.loadChart();
  }

  cargaEstadoSuccessUsuario(){
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


  loginMicrosoft(){
    this.appComponent.loginRedirect();
  }

  loadChart() {
    const canvas = document.getElementById('auditChart') as HTMLCanvasElement;
    if (!canvas) return;
    console.log('hola')
    new Chart(canvas.getContext('2d')!, {
      type: 'pie',
      data: {
        labels: ['Completadas', 'Pendientes', 'En Progreso'],
        datasets: [{
          data: [45, 12, 8],
          backgroundColor: ['#007bff', '#ffc107', '#28a745']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          legend: {
            position: 'top'
          }
        }
      }
    });
  }
}
