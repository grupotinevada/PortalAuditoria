import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IProyecto } from 'src/models/proyecto.model';
import { ISociedad } from 'src/models/sociedad.model';

@Injectable({
  providedIn: 'root'
})
export class ProyectoService {

  private apiUrl = environment.apiUrl.api;

  constructor(private http: HttpClient) { }

  obtenerProyectosPorPais(PaisID: number): Observable<IProyecto[]> {
    return this.http.get<IProyecto[]>(`${this.apiUrl}/proyectos/${PaisID}`);
  }

  obtenerSociedades(idProyecto: number): Observable<ISociedad[]> {
    return this.http.get<ISociedad[]>(`${this.apiUrl}/sociedades/${idProyecto}`);
  }
}
