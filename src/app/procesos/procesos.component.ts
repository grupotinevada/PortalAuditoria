import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProyectoService } from 'src/services/proyecto.service';
import { IProceso } from 'src/models/proceso.model';
import { CommonModule } from '@angular/common';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ProyectoEventoService } from 'src/services/proyecto-evento.service';

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
  loading = true;
  errorMessage: string | null = null;     // Errores del servidor (rojo)
  infoMessage: string | null = null;      // Mensajes informativos (amarillo)
  

  constructor(
    private route: ActivatedRoute,
    private proyectoService: ProyectoService,
    private eventoService: ProyectoEventoService
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

    this.eventoService.procesoCreado$.subscribe(() => {
      this.cargarProcesos(); // 👈 recargar procesos al crear uno nuevo
    });
  }

  cargarProcesos():void {
    this.loading = true;
    this.errorMessage = null;
    
    console.log('🔹 Cargando procesos para sociedad:', this.idSociedad);
    
    this.proyectoService.obtenerProcesosPorSociedad(this.idSociedad, this.idProyecto)
      .pipe(
        catchError(error => {
          this.errorMessage = 'Error al cargar los procesos';
          console.error('❌ Error al obtener procesos:', error);
          this.loading = false;
          return of([]); // Continuar flujo aunque haya error
        })
      )
      .subscribe(data => {
        this.procesos = data;
        console.log('✅ Procesos recibidos:', data);
  
        if (this.procesos.length > 0) {
          this.nombreSociedad = this.procesos[0].nombresociedad;
        } else {
          this.infoMessage = 'No se encontraron procesos para esta sociedad';
        }
  
        this.loading = false;
      });
}


}