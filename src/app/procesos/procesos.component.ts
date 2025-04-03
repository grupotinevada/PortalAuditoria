import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProyectoService } from 'src/services/proyecto.service';
import { IProceso } from 'src/models/proceso.model';
import { NgIf, NgFor, CommonModule } from '@angular/common';

@Component({
  selector: 'app-procesos',
  imports: [CommonModule, NgIf, NgFor],
  templateUrl: './procesos.component.html',
  styleUrl: './procesos.component.css'
})
export class ProcesosComponent implements OnInit {
  procesos: IProceso[] = [];
  idSociedad!: number;
  PaisID!: number;
  idProyecto!: number;
  loading: boolean = true;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private proyectoService: ProyectoService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      // Obtener valores de los parámetros de la URL
      this.PaisID = Number(params.get('PaisID'));
      this.idProyecto = Number(params.get('ProyectoID'));
      this.idSociedad = Number(params.get('SociedadID'));
      
      // Agregar un console.log para ver los parámetros
      console.log('🔹 Parámetros obtenidos:', params)

      // Validar si idProyecto es un número válido
      if (isNaN(this.idProyecto) || !this.idProyecto) {
          console.warn('⚠️ No se proporcionó un ID de proyecto válido.');
          return;
          }
    
    
    }
    
    )
    }

  cargarProcesos(): void {
    console.log('[ACTION] Cargando procesos para sociedad ID:', this.idSociedad);

    this.proyectoService.obtenerProcesosPorSociedad(this.idSociedad).subscribe({
      next: (data) => {
        console.log('[SUCCESS] Procesos obtenidos:', data);
        this.procesos = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('[ERROR] Error al obtener procesos:', error);
        this.errorMessage = 'No se encontraron procesos';
        this.loading = false;
      }
    });
  }
}
