import { Routes } from '@angular/router';
import { FailedComponent } from './failed/failed.component';
import { HomeComponent } from './home/home.component';
import { ProfileComponent } from './profile/profile.component';
import { MsalGuard } from '@azure/msal-angular';
import { ProyectoComponent } from './proyecto/proyecto.component';
import { SociedadesComponent } from './sociedades/sociedades.component';
import { ProcesosComponent } from './procesos/procesos.component';
import { PaisComponent } from './pais/pais.component';
import { InformesComponent } from './informes/informes.component';
import { AuthGuard } from '../guards/auth.guard';
import { AdministracionComponent } from './administracion/administracion.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [MsalGuard, AuthGuard],
    data: { breadcrumb: 'Perfil' }
  },
  {
    path: 'informes',
    component: InformesComponent,
    canActivate: [MsalGuard, AuthGuard],
    data: { breadcrumb: 'informes' }
  },
  {
    path: 'login-failed',
    component: FailedComponent,
    data: { breadcrumb: 'Error de Login' }
  },
  {
    path: 'administracion',
    component: AdministracionComponent,
    canActivate:[MsalGuard, AuthGuard],
    data: { breadcrumb: 'Administración'}
  },
  {
    path: 'pais',
    component: PaisComponent,
    canActivate: [MsalGuard, AuthGuard],
    data: { breadcrumb: 'Países' }
  },
  {
    path: 'pais/:PaisID',
    component: ProyectoComponent,
    canActivate: [MsalGuard, AuthGuard],
    data: { breadcrumb: 'País' } 
  },
  {
    path: 'pais/:PaisID/proyecto/:ProyectoID',
    component: SociedadesComponent,
    canActivate: [MsalGuard, AuthGuard],
    data: { breadcrumb: 'Proyecto' } 
  },
  {
    path: 'pais/:PaisID/proyecto/:ProyectoID/sociedad/:SociedadID',
    component: ProcesosComponent,
    canActivate: [MsalGuard, AuthGuard],
    data: { breadcrumb: 'Sociedad' } 
  }
];
