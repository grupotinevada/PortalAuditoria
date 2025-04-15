import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ProyectoEventoService } from 'src/services/proyecto-evento.service';

@Component({
  selector: 'app-editar-proceso',
  imports: [CommonModule],
  templateUrl: './editar-proceso.component.html',
  styleUrl: './editar-proceso.component.css',
})
export class EditarProcesoComponent implements OnInit {
  @Input() idProceso: number | null = null;

  constructor(private modalService: ProyectoEventoService) {}

  ngOnInit(): void {
    console.log('aaaaaa ID del proceso a editar:', this.idProceso);
    // aquí puedes llamar a un servicio que obtenga los datos para rellenar el formulario
  }

  cerrarModalEditar() {
    this.modalService.cerrarEditarProceso();
  }
}