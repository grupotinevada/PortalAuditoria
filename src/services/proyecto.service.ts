/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IProyecto } from 'src/models/proyecto.model';
import { ISociedad } from 'src/models/sociedad.model';
import { UserService } from './user.service';
import { IPais } from 'src/models/pais.model';
import { IEstado } from 'src/models/estado.model';


@Injectable({
  providedIn: 'root'
})
export class ProyectoService {

  private proyectosSubject = new BehaviorSubject<IProyecto[]>([]);
  proyectos$ = this.proyectosSubject.asObservable();
  constructor(private http: HttpClient, private userService: UserService) { }
  private apiUrl = environment.apiUrl.api;

  //Obtiene los proyectos filtrados por pais
  obtenerProyectosPorPais(PaisID: number): Observable<IProyecto[]> {
    return this.http.get<IProyecto[]>(`${this.apiUrl}/proyectos/${PaisID}`);
  }

  //obtiene todas las sociedades sin filtros
  obtenerTodasSociedades(): Observable<ISociedad[]> {
    return this.http.get<ISociedad[]>(`${this.apiUrl}/sociedades`);
  }

  //obtiene las sociedades segun el filtro de idproyecto
  obtenerSociedades(idProyecto: number): Observable<ISociedad[]> {
    return this.http.get<ISociedad[]>(`${this.apiUrl}/sociedades/por-proyecto/${idProyecto}`);
  }


  ObtenerSociedadesPorPais(PaisID: number): Observable<ISociedad[]> {
    return this.http.get<ISociedad[]>(`${this.apiUrl}/sociedades/por-pais/${PaisID}`);
  }

  // Nuevo método para crear proyecto
  crearProyecto(proyecto: IProyecto): Observable<IProyecto> {
    const currentUser = this.userService.getCurrentUser();
    
    if (!currentUser || !currentUser.idusuario) {
      throw new Error('Usuario no autenticado o sin ID');
    }

    const body = {
      idpais: proyecto.idpais,
      idusuario: proyecto.idusuario, // Usamos el ID real del usuario
      nombreproyecto: proyecto.nombreproyecto,
      fecha_inicio: proyecto.fecha_inicio,
      fecha_termino: proyecto.fecha_termino,
      habilitado: proyecto.habilitado || 1,
      eliminado: proyecto.eliminado ?? 0
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
  
  


  // Método para actualizar un proyecto (basado en tu endpoint PUT)
  actualizarProyecto(idProyecto: number, proyectoData: any): Observable<any> {
    const currentUser = this.userService.getCurrentUser();
    
    if (!currentUser || !currentUser.idusuario) {
      throw new Error('Usuario no autenticado o sin ID');
    }

    // Estructura los datos según lo esperado por el backend
    const body = {
      idpais: proyectoData.idpais,
      idusuario: currentUser.idusuario, // Usamos el ID real del usuario
      nombreproyecto: proyectoData.nombreproyecto,
      fecha_inicio: proyectoData.fecha_inicio,
      fecha_termino: proyectoData.fecha_termino,
      habilitado: proyectoData.habilitado !== undefined ? proyectoData.habilitado : 1,
      sociedadesSeleccionadas: proyectoData.sociedadesSeleccionadas || []
    };

    console.log('Enviando datos para actualizar proyecto:', body);
    return this.http.put(`${this.apiUrl}/proyecto/${idProyecto}`, body);
  }

  // Método para eliminar un proyecto
  eliminarProyecto(idProyecto: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/proyecto/${idProyecto}`).pipe(
      tap(() => {
        // Actualizar el listado en el servicio marcando el proyecto como eliminado
        const current = this.proyectosSubject.value;
        const updated = current.map(p => 
          p.idproyecto === idProyecto ? { ...p, eliminado: 1 } : p
        );
        this.proyectosSubject.next(updated);
      })
    );
  }

  obtenerTotalDeProyectos(): Observable<[]> {
    return this.http.get<[]>(`${this.apiUrl}/proyectos`);
  }

  obtenerEstados(): Observable<IEstado[]> {
    return this.http.get<IEstado[]>(`${this.apiUrl}/estados`);
  }














  //SERVICIOS PARA OBTENER DATOS LIMPIOS Y GENERALES SE USAN PARA EL BRADCRUMB

  //SOLO PAISES POR SU PROPIO ID 
  obtenerPaisporIdPais(idpais: number): Observable<IPais> {
    return this.http.get<IPais[]>(`${this.apiUrl}/pais/${idpais}`).pipe(
      map(response => response[0])
    );
  }
  
  //Solo sociedades por su propio id
  obtenerProyectoPorIdProyecto(idProyecto: number): Observable<IProyecto> {
    return this.http.get<IProyecto>(`${this.apiUrl}/proyecto/${idProyecto}`);
  }
  
  
  //Solo sociedades por su propio id
  obtenerSociedadesPorIdSociedad(idsociedad: number): Observable<ISociedad> {
    return this.http.get<ISociedad[]>(`${this.apiUrl}/sociedad/${idsociedad}`).pipe(
      map(response => response[0])

    );
  }
}
