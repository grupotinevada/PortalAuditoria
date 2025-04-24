/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { IProceso } from 'src/models/proceso.model';
import { Observable } from 'rxjs';
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


    //Obtiene todoslos procesos de cada sociedad para la tabla de procesos
    obtenerProcesosPorSociedad(idSociedad: number,idProyecto: number ): Observable<IProceso[]> {
      return this.http.get<IProceso[]>(`${this.apiUrl}/procesos/${idSociedad}/${idProyecto}`);
    }


      //obtiene un proceso por idproceso para editar proceso
  obtenerProcesoPorId(idproceso: number): Observable<IProceso> {
    const url = `${this.apiUrl}/proceso/${idproceso}`;
    return this.http.get<IProceso>(url);
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




   actualizarProceso(idproceso: any, datos: FormData, overwrite: boolean, accessToken: string) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`
    });
    
    let params = new HttpParams();
    if (overwrite) {
      params = params.set('overwrite', 'true');
    }
  
    return this.http.put<{ mensaje: string, archivosSubidos: any[] | null }>(
      `${this.apiUrl}/proceso/${idproceso}`,
      datos,
      { headers, params }
    );
    
  }
  
  

  eliminarProceso(idproceso: number, accessToken: string) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`
    });

    return this.http.delete<any>(`${this.apiUrl}/proceso/${idproceso}`, { headers });
  }

  eliminarArchivo(idproceso: any, nombreArchivo: string, accessToken: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${accessToken}`
    });

    const url = `${this.apiUrl}/archivo/${idproceso}/${encodeURIComponent(nombreArchivo)}`;
    return this.http.delete(url, { headers });
  }
}


