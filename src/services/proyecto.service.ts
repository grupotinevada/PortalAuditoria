import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IProyecto } from 'src/models/proyecto.model';
import { ISociedad } from 'src/models/sociedad.model';

@Injectable({
  providedIn: 'root'
})
export class ProyectoService {

  private apiUrl = 'http://localhost:3000';
  constructor(private http: HttpClient) { }

  obtenerProyectosPorPais(PaisID: number): Observable<IProyecto[]> {
    return this.http.get<IProyecto[]>(`${this.apiUrl}/proyectos/${PaisID}`);
  }

  obtenerSociedades(idProyecto: number): Observable<ISociedad[]> {
    return this.http.get<ISociedad[]>(`${this.apiUrl}/sociedades/${idProyecto}`);
  }

  obtenerProcesosPorSociedad(idSociedad: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/procesos/${idSociedad}`);
  }
}
