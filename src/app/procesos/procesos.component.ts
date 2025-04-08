import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProyectoService } from 'src/services/proyecto.service';
import { IProceso } from 'src/models/proceso.model';
import { CommonModule } from '@angular/common';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-procesos',
  imports: [CommonModule],
  templateUrl: './procesos.component.html',
  styleUrl: './procesos.component.css'
})
export class ProcesosComponent implements OnInit {
  procesos: IProceso[] = [];
  idSociedad!: number;
  nombreSociedad: string | null = null;
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
      
      console.log('🔹 Parámetros obtenidos:', {
        PaisID: this.PaisID,
        ProyectoID: this.idProyecto,
        SociedadID: this.idSociedad
      });

      // Validar parámetros
      if (isNaN(this.idSociedad)) {
        this.errorMessage = 'ID de sociedad no válido';
        this.loading = false;
        console.error('⚠️ ID de sociedad no válido:', this.idSociedad);
        return;
      }

      // Llamar a cargar procesos solo si tenemos un ID válido
      this.cargarProcesos();
    });
  }

  cargarProcesos():void {
    this.loading = true;
    this.errorMessage = null;
    
    console.log('🔹 Cargando procesos para sociedad:', this.idSociedad);
    
    this.proyectoService.obtenerProcesosPorSociedad(this.idSociedad, this.idProyecto)
      .pipe(
        finalize(() => this.loading = false),
        catchError(error => {
          this.errorMessage = 'Error al cargar los procesos';
          console.error('❌ Error al obtener procesos:', error);
          return of([]); // Retorna un array vacío para que la suscripción no falle
        })
      )
      .subscribe({
        next: (data) => {
          this.procesos = data;
          console.log('✅ Procesos recibidos:', data);
              // Asumiendo que el primer elemento tiene el nombre de la sociedad
            if(data.length > 0) {
              this.nombreSociedad = data[0].nombresociedad; 
              //console.log('nombre socieda: ',this.nombreSociedad);
            }
          if (data.length === 0) {
            this.errorMessage = 'No se encontraron procesos para esta sociedad';
          }
        }
      });
  }
}