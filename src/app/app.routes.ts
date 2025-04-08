import { Routes } from '@angular/router';
import { FailedComponent } from './failed/failed.component';
import { HomeComponent } from './home/home.component';
import { ProfileComponent } from './profile/profile.component';
import { MsalGuard } from '@azure/msal-angular';
import { ProyectoComponent } from './proyecto/proyecto.component';
import { SociedadesComponent } from './sociedades/sociedades.component';
import { ProcesosComponent } from './procesos/procesos.component';
import { PaisComponent } from './pais/pais.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [MsalGuard],
    data: { breadcrumb: 'Perfil' }
  },
  {
    path: 'login-failed',
    component: FailedComponent,
    data: { breadcrumb: 'Error de Login' }
  },
  {
    path: 'pais',
    component: PaisComponent,
    canActivate: [MsalGuard],
    data: { breadcrumb: 'Países' }
  },
  {
    path: 'pais/:PaisID',
    component: ProyectoComponent,
    canActivate: [MsalGuard],
    data: { breadcrumb: 'País' } // nombre real se carga dinámicamente
  },
  {
    path: 'pais/:PaisID/proyecto/:ProyectoID',
    component: SociedadesComponent,
    canActivate: [MsalGuard],
    data: { breadcrumb: 'Proyecto' } // nombre real se carga dinámicamente
  },
  {
    path: 'pais/:PaisID/proyecto/:ProyectoID/sociedad/:SociedadID',
    component: ProcesosComponent,
    canActivate: [MsalGuard],
    data: { breadcrumb: 'Sociedad' } // nombre real se carga dinámicamente
  }
];
