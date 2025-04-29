/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import { ProyectoService } from './proyecto.service';

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private breadcrumbsSubject = new BehaviorSubject<{ label: string, url: string }[]>([]);
  breadcrumbs$ = this.breadcrumbsSubject.asObservable();
  private entityNamesCache: Record<string, string> = {};

  constructor(
    private router: Router, 
    private activatedRoute: ActivatedRoute,
    private proyectoService: ProyectoService
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      switchMap(() => this.buildBreadcrumbsWithData(this.router.url))
    ).subscribe(breadcrumbs => {
      this.breadcrumbsSubject.next(breadcrumbs);
    });

    const cachedNames = localStorage.getItem('breadcrumbNames');
    if (cachedNames) {
      this.entityNamesCache = JSON.parse(cachedNames);
    }
  }

  updateBreadcrumbLabel(url: string, newLabel: string): void {
    this.entityNamesCache[url] = newLabel;
    localStorage.setItem('breadcrumbNames', JSON.stringify(this.entityNamesCache));

    const currentBreadcrumbs = this.breadcrumbsSubject.value;
    const updatedBreadcrumbs = currentBreadcrumbs.map(breadcrumb => {
      if (breadcrumb.url === url) {
        return { ...breadcrumb, label: newLabel };
      }
      return breadcrumb;
    });
    this.breadcrumbsSubject.next(updatedBreadcrumbs);
  }

  private buildBreadcrumbsWithData(url: string): Observable<{ label: string, url: string }[]> {
    const breadcrumbs: { label: string, url: string }[] = [];
    const urlParts = url.split('/').filter(part => part);
    let currentUrl = '';

    breadcrumbs.push({ label: 'Inicio', url: '/' });

    let paisId: number | null = null;
    let proyectoId: number | null = null;
    let sociedadId: number | null = null;

    for (let i = 0; i < urlParts.length; i++) {
      const part = urlParts[i];
      currentUrl += '/' + part;

      if (part === 'pais') {
        breadcrumbs.push({ label: 'Países', url: currentUrl });
      } else if (i > 0 && urlParts[i - 1] === 'pais' && !isNaN(Number(part))) {
        paisId = Number(part);
        
        const cachedName = this.entityNamesCache[currentUrl];
        breadcrumbs.push({
          label: cachedName || `País ${part}`,
          url: currentUrl
        });
      } else if (part === 'proyecto') {
        breadcrumbs.push({ label: 'Proyectos', url: currentUrl });
      } else if (i > 0 && urlParts[i - 1] === 'proyecto' && !isNaN(Number(part))) {
        proyectoId = Number(part);
        const cachedName = this.entityNamesCache[currentUrl];
        breadcrumbs.push({
          label: cachedName || `Proyecto ${part}`,
          url: currentUrl
        });
      } else if (part === 'sociedad') {
        continue;
      } else if (i > 0 && urlParts[i - 1] === 'sociedad' && !isNaN(Number(part))) {
        sociedadId = Number(part);
        const cachedName = this.entityNamesCache[currentUrl];
        breadcrumbs.push({
          label: cachedName || `Sociedad ${part}`,
          url: currentUrl
        });
      } else if (part === 'profile') {
        breadcrumbs.push({ label: 'Perfil', url: currentUrl });
      } else if (part === 'login-failed') {
        breadcrumbs.push({ label: 'Error de Login', url: currentUrl });
      }
        else if (part === 'crear-usuario') {
        breadcrumbs.push({ label: 'Administración', url: currentUrl });
      }
    }

    const requests: Observable<any>[] = [];

    if (paisId !== null) {
      this.cargarEntidad(
        paisId,
        `/pais/${paisId}`,
        breadcrumbs,
        requests,
        (id: number) => this.proyectoService.obtenerPaisporIdPais(id), // Llamar directamente a la función con el parámetro
        pais => pais?.cod ?? null, // Mostrar cod en lugar de nombrepais
        'País'
      );
    }
    
    

    if (proyectoId !== null) {
      this.cargarEntidad(
        proyectoId,
        `/pais/${paisId}/proyecto/${proyectoId}`,
        breadcrumbs,
        requests,
        this.proyectoService.obtenerProyectoPorIdProyecto.bind(this.proyectoService),
        proyecto => proyecto?.nombreproyecto ?? null,
        'Proyecto'
      );
    }

    if (sociedadId !== null) {
      this.cargarEntidad(
        sociedadId,
        `/pais/${paisId}/proyecto/${proyectoId}/sociedad/${sociedadId}`,
        breadcrumbs,
        requests,
        this.proyectoService.obtenerSociedadesPorIdSociedad.bind(this.proyectoService),
        sociedad => sociedad?.nombresociedad ?? null,
        'Sociedad'
      );
    }

    if (requests.length > 0) {
      return forkJoin(requests).pipe(
        catchError(error => {
          console.error('Error en alguna de las peticiones:', error);
          return of([]);
        }),
        map(() => {
          localStorage.setItem('breadcrumbNames', JSON.stringify(this.entityNamesCache));
          return breadcrumbs;
        })
      );
    } else {
      return of(breadcrumbs);
    }
  }

  private cargarEntidad<T>(
    id: number,
    url: string,
    breadcrumbs: any[],
    requests: Observable<any>[],
    fetchFn: (id: number) => Observable<T>,
    nombreExtractor: (entidad: T) => string | null,
    entidadLabel: string
  ): void {
    if (!this.entityNamesCache[url]) {
      const request = fetchFn(id).pipe(
        catchError(error => {
          console.error(`Error al obtener ${entidadLabel.toLowerCase()}:`, error);
          this.entityNamesCache[url] = `${entidadLabel} ${id}`;
          return of(null);
        }),
        tap(entidad => {
          if (!entidad) return;
          console.log('entidad',entidad);
          const nombre = nombreExtractor(entidad);
          const nombreValido = nombre && nombre.trim() !== ''
            ? nombre
            : `${entidadLabel} ${id}`;

          this.entityNamesCache[url] = nombreValido;

          const index = breadcrumbs.findIndex(b => b.url === url);
          if (index >= 0) {
            breadcrumbs[index].label = nombreValido;
          }
        })
      );

      requests.push(request);
    } else {
      const index = breadcrumbs.findIndex(b => b.url === url);
      if (index >= 0) {
        breadcrumbs[index].label = this.entityNamesCache[url];
      }
    }
  }
}
