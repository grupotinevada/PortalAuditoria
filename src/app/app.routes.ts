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
    path: 'profile',
    component: ProfileComponent,
    canActivate: [MsalGuard],
  },
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'login-failed',
    component: FailedComponent,
  },
  { path: 'pais', 
    component: PaisComponent, 
    canActivate:[MsalGuard]
  },
  { path: 'pais/:PaisID', 
    component: ProyectoComponent, 
    canActivate:[MsalGuard]
  },

  { path: 'pais/:PaisID/proyecto/:ProyectoID', 
    component: SociedadesComponent, 
    canActivate:[MsalGuard] 
  },

  { path: 'pais/:PaisID/proyecto/:ProyectoID/sociedad/:SociedadID', 
    component: ProcesosComponent, 
    canActivate:[MsalGuard] },

];
