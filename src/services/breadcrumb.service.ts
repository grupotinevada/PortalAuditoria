import { Injectable } from '@angular/core';
import { IProyecto } from 'src/models/proyecto.model';
import { ISociedad } from 'src/models/sociedad.model';
import { ProyectoService } from './proyecto.service';
import { map, Observable, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private proyectosCache = new Map<number, IProyecto>();
  private sociedadesCache = new Map<number, ISociedad>();

  constructor(private proyectoService: ProyectoService) { }

  obtenerNombrePais(PaisID: number): Observable<string | null>{
    if (this.proyectosCache.has(PaisID)) {
      return of(this.proyectosCache.get(PaisID)!.nombrepais);
    }
    return this.proyectoService.obtenerProyectosPorPais(PaisID).pipe(
      tap(proyectos => {
        if (proyectos.length > 0) {
          this.proyectosCache.set(PaisID, proyectos[0]);
        }
      }),
      map(proyectos => proyectos.length > 0 ? proyectos[0].nombrepais : `País ${PaisID}`)
    );
  }

  obtenerNombreProyecto(PaisID: number, ProyectoID: number | string): Observable<string | null> {
    if (this.proyectosCache.has(PaisID)) {
      return of(this.proyectosCache.get(PaisID)!.nombreproyecto);
    }
    return this.proyectoService.obtenerProyectosPorPais(PaisID).pipe(
      tap(proyectos => {
        proyectos.forEach(proyecto => this.proyectosCache.set(PaisID, proyecto));
      }),
      map(proyectos => {
        const proyecto = proyectos.find(p => p.cod === ProyectoID);
        return proyecto ? proyecto.nombreproyecto : `Proyecto ${ProyectoID}`;
      })
    );
  }

  obtenerNombreSociedad(ProyectoID: number, SociedadID: number): Observable<string> {
    if (this.sociedadesCache.has(SociedadID)) {
      return of(this.sociedadesCache.get(SociedadID)!.nombresociedad);
    }
    return this.proyectoService.obtenerSociedades(ProyectoID).pipe(
      tap(sociedades => {
        sociedades.forEach(s => this.sociedadesCache.set(s.idsociedad, s));
      }),
      map(sociedades => {
        const sociedad = sociedades.find(s => s.idsociedad === SociedadID);
        return sociedad ? sociedad.nombresociedad : `Sociedad ${SociedadID}`;
      })
    );
  }


  }

