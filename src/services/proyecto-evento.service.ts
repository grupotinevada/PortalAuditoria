// src/services/proyecto-evento.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { IProyecto } from 'src/models/proyecto.model';

@Injectable({
  providedIn: 'root'
})
export class ProyectoEventoService {
  private proyectoCreadoSource = new Subject<IProyecto>();
  proyectoCreado$ = this.proyectoCreadoSource.asObservable();

  emitirProyectoCreado(proyecto: IProyecto) {
    this.proyectoCreadoSource.next(proyecto);
  }
}
