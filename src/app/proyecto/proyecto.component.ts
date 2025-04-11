import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProyectoService } from '../../services/proyecto.service';
import { CommonModule } from '@angular/common';
import { IProyecto } from 'src/models/proyecto.model';
import { ProyectoEventoService } from 'src/services/proyecto-evento.service';
import { EditarProyectoComponent } from "../editar-proyecto/editar-proyecto.component";

@Component({
  selector: 'app-proyecto',
  imports: [CommonModule, EditarProyectoComponent],
  templateUrl: './proyecto.component.html',
  styleUrl: './proyecto.component.css'
})
export class ProyectoComponent implements OnInit {
  idPais!: number;
  proyectos: IProyecto[] = [];
  nombrePais: string | null = null;
  proyectoSeleccionado: IProyecto | null = null;
  mostrarModalEdicion = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private proyectoService: ProyectoService,
    private proyectoEventoService: ProyectoEventoService
  ) {}

  ngOnInit(): void {
    this.cargarProyectosPorPais();

    this.proyectoEventoService.proyectoCreado$.subscribe((nuevoProyecto) => {
      console.log('Proyecto nuevo detectado en ProyectoComponent:', nuevoProyecto);
      this.cargarProyectosPorPais();
    });

    // Escuchar eventos de actualización
    this.proyectoEventoService.proyectoActualizado$.subscribe(() => {
      this.cargarProyectosPorPais();
    });
  }

  private cargarProyectosPorPais(): void {
    this.idPais = Number(this.route.snapshot.paramMap.get('PaisID'));
    if (this.idPais) {
      this.proyectoService.obtenerProyectosPorPais(this.idPais).subscribe((proyectos: IProyecto[]) => {
        this.proyectos = proyectos.filter(p => p.idpais === this.idPais);
        console.log('proyectos filtrados: ', this.proyectos);
      });
    }
  }

  seleccionarProyecto(idProyecto: number | null) {
    this.router.navigate(['/pais', this.idPais, 'proyecto', idProyecto]);
  }

  abrirModalEdicion(proyecto: IProyecto): void {
    this.proyectoSeleccionado = {...proyecto}; // Clonar el objeto para evitar mutaciones
    this.mostrarModalEdicion = true;
  }

  editarProyecto(idProyecto: number): void {
    // Buscar el proyecto con el ID correspondiente
    const proyecto = this.proyectos.find(p => p.idproyecto === idProyecto);
    if (proyecto) {
      console.log('Proyecto encontrado:', proyecto);
      this.abrirModalEdicion(proyecto);
    } else {
      console.error('Proyecto no encontrado con ID:', idProyecto);
    }
  }
  cerrarModalEdicion(): void {
    this.mostrarModalEdicion = false;
    this.proyectoSeleccionado = null;
  }

  actualizarProyecto(proyectoActualizado: IProyecto): void {
    if (this.proyectoSeleccionado && this.proyectoSeleccionado.idproyecto) {
      this.proyectoService.actualizarProyecto(
        this.proyectoSeleccionado.idproyecto,
        proyectoActualizado
      ).subscribe({
        next: () => {
          this.proyectoEventoService.notificarProyectoActualizado();
          this.cerrarModalEdicion();
        },
        error: (err) => console.error('Error al actualizar proyecto:', err)
      });
    }
  }
}