// src/services/proyecto-evento.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { IProyecto } from 'src/models/proyecto.model';

@Injectable({
  providedIn: 'root'
})
export class ProyectoEventoService {
  private proyectoCreadoSource = new Subject<IProyecto>();
  proyectoCreado$ = this.proyectoCreadoSource.asObservable();
  //varibales para el modal crear proyecto
  private mostrarModalCrearProcesoSubject = new BehaviorSubject<boolean>(false);
  mostrarModalCrearProceso$ = this.mostrarModalCrearProcesoSubject.asObservable();

  emitirProyectoCreado(proyecto: IProyecto) {
    this.proyectoCreadoSource.next(proyecto);
  }

//MODAL PROCESO
  abrirCrearProceso() {
    this.mostrarModalCrearProcesoSubject.next(true);
  }

  cerrarCrearProceso() {
    this.mostrarModalCrearProcesoSubject.next(false);
  }
}


