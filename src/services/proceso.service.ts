/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { IProceso } from 'src/models/proceso.model';
import { map, Observable } from 'rxjs';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class ProcesoService {
  private apiUrl = environment.apiUrl.api;
  constructor(
    private http: HttpClient,
    private userService: UserService
  ) { }


    //Obtiene todoslos procesos de cada sociedad
    obtenerProcesosPorSociedad(idSociedad: number,idProyecto: number ): Observable<IProceso[]> {
      return this.http.get<IProceso[]>(`${this.apiUrl}/procesos/${idSociedad}/${idProyecto}`);
    }

    //crea el proceso
    crearProceso(procesoData: FormData, accessToken: string): Observable<any> {
    const currentUser = this.userService.getCurrentUser();
  
    if (!currentUser || !currentUser.idusuario) {
      throw new Error('Usuario no autenticado o sin ID');
    }
  
    const headers = new HttpHeaders({
      Authorization: `Bearer: ${accessToken}`
    });
  
    return this.http.post(`${this.apiUrl}/procesos`, procesoData, { headers });
  }

  //obtiene un proceso por idproceso
  obtenerProcesoPorId(idproceso: number): Observable<IProceso> {
    const url = `${this.apiUrl}/proceso/${idproceso}`;

    return this.http.get<IProceso>(url).pipe(
      map((proceso: IProceso) => ({
        ...proceso,
        fecha_inicio: proceso.fecha_inicio ? new Date(proceso.fecha_inicio) : null,
        fecha_fin: proceso.fecha_fin ? new Date(proceso.fecha_fin) : null
      }))
    );
  }



}
