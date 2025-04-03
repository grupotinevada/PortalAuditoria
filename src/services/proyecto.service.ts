import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IProyecto } from 'src/models/proyecto.model';
import { ISociedad } from 'src/models/sociedad.model';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class ProyectoService {

  private proyectosSubject = new BehaviorSubject<IProyecto[]>([]);
  proyectos$ = this.proyectosSubject.asObservable();
  constructor(private http: HttpClient, private userService: UserService) { }
  private apiUrl = environment.apiUrl.api;

  obtenerProyectosPorPais(PaisID: number): Observable<IProyecto[]> {
    return this.http.get<IProyecto[]>(`${this.apiUrl}/proyectos/${PaisID}`);
  }

  obtenerSociedades(idProyecto: number): Observable<ISociedad[]> {
    return this.http.get<ISociedad[]>(`${this.apiUrl}/sociedades/${idProyecto}`);
  }

  obtenerProcesosPorSociedad(idSociedad: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/procesos/${idSociedad}`);
  }

  // Nuevo método para crear proyecto
  crearProyecto(proyecto: IProyecto): Observable<IProyecto> {
    const currentUser = this.userService.getCurrentUser();
    
    if (!currentUser || !currentUser.idusuario) {
      throw new Error('Usuario no autenticado o sin ID');
    }

    const body = {
      idpais: proyecto.idpais,
      idusuario: currentUser.idusuario, // Usamos el ID real del usuario
      nombreproyecto: proyecto.nombreproyecto,
      fecha_inicio: proyecto.fecha_inicio,
      fecha_termino: proyecto.fecha_termino,
      habilitado: proyecto.habilitado || 1
    };
    
    console.log('Enviando datos de proyecto:', body);
    return this.http.post<IProyecto>(`${this.apiUrl}/proyecto`, proyecto).pipe(
      tap((nuevoProyecto) => {
        // Actualizar el listado en el servicio
        const current = this.proyectosSubject.value;
        this.proyectosSubject.next([...current, nuevoProyecto]);
      })
    );
  }
}
