// src/services/proyecto-evento.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { IProyecto } from 'src/models/proyecto.model';

@Injectable({
  providedIn: 'root'
})
export class ProyectoEventoService {
  //varibales para el modal crear proyecto
  private proyectoCreadoSource = new Subject<IProyecto>();
  private proyectoActualizadoSource = new Subject<void>();
  proyectoCreado$ = this.proyectoCreadoSource.asObservable();
  //variables para el modal de editar proyecto
  proyectoActualizado$ = this.proyectoActualizadoSource.asObservable();
  
  //varaibles para el modal de crear proceso
  private procesoCreadoSubject = new Subject<void>();  //refresh
  procesoCreado$ = this.procesoCreadoSubject.asObservable();//refresh

  private mostrarModalCrearProcesoSubject = new BehaviorSubject<boolean>(false);
  mostrarModalCrearProceso$ = this.mostrarModalCrearProcesoSubject.asObservable();


  emitirProyectoCreado(proyecto: IProyecto) {
    this.proyectoCreadoSource.next(proyecto);
  }

  notificarProyectoCreado(proyecto: IProyecto) {
    this.proyectoCreadoSource.next(proyecto);
  }

  notificarProyectoActualizado() {
    this.proyectoActualizadoSource.next();
  }




//MODAL PROCESO
  abrirCrearProceso() {
    this.mostrarModalCrearProcesoSubject.next(true);
  }

  cerrarCrearProceso() {
    this.mostrarModalCrearProcesoSubject.next(false);
  }
  notificarProcesoCreado() {
    this.procesoCreadoSubject.next();
  }




}


