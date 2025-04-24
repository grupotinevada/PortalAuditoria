
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProcesoService } from './../../services/proceso.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IProceso } from 'src/models/proceso.model';
import { CommonModule } from '@angular/common';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ProyectoEventoService } from 'src/services/proyecto-evento.service';
import { EditarProcesoComponent } from '../editar-proceso/editar-proceso.component';
import { environment } from 'src/environments/environment';
import { MsalService } from '@azure/msal-angular';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-procesos',
  imports: [CommonModule, EditarProcesoComponent],
  templateUrl: './procesos.component.html',
  styleUrl: './procesos.component.css',
})
export class ProcesosComponent implements OnInit {

  procesos: IProceso[] = [];
  idSociedad!: number;
  nombreSociedad: string | null = null;
  PaisID!: number;
  idProyecto!: number;
  loading = true;
  errorMessage: string | null = null; // Errores del servidor (rojo)
  infoMessage: string | null = null; // Mensajes informativos (amarillo)
  mostrarModalEditarProceso = false;
  idProcesoAEditar: number | null = null;
  ordenCampo =  '';
  ordenAscendente = true;
  isLoading = false;
  mostrarModalArchivos = false;
  procesoSeleccionado: any = null;
  
  constructor(
    private route: ActivatedRoute,
    private procesoService: ProcesoService,
    private eventoService: ProyectoEventoService,
    private modalService: ProyectoEventoService,
    private authService: MsalService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      // Obtener valores de los parámetros de la URL
      this.PaisID = Number(params.get('PaisID'));
      this.idProyecto = Number(params.get('ProyectoID'));
      this.idSociedad = Number(params.get('SociedadID'));

      console.log('🔹 Parámetros obtenidos:', {
        PaisID: this.PaisID,
        ProyectoID: this.idProyecto,
        SociedadID: this.idSociedad,
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
    this.eventoService.procesoEditado$.subscribe(() => {
      this.cargarProcesos(); // 👈 recargar procesos al crear uno nuevo
    });
    this.modalService.mostrarModalEditarProceso$.subscribe((mostrar) => {
      this.mostrarModalEditarProceso = mostrar;
    });

    this.modalService.idProcesoEditar$.subscribe((idproceso) => {
      this.idProcesoAEditar = idproceso;
    });
  }

  cargarProcesos(): void {
    this.loading = true;
    this.errorMessage = null;
    this.infoMessage = null;
  
    console.log('🔹 Cargando procesos para sociedad:', this.idSociedad);
  
    this.procesoService
      .obtenerProcesosPorSociedad(this.idSociedad, this.idProyecto)
      .pipe(
        catchError((error) => {
          this.errorMessage = 'Error al cargar los procesos';
          console.error('❌ Error al obtener procesos:', error);
          this.loading = false;
          return of([]); // Continuar flujo aunque haya error
        })
      )
      .subscribe((data) => {
        this.procesos = data;
        console.log('✅ Procesos recibidos:', data);
        
        // Verificar si los procesos tienen archivos
        this.procesos.forEach(proceso => {
          console.log(`Proceso ${proceso.idproceso} - Archivos:`, proceso.archivos);
          // Asegurarnos de que siempre sea un array
          if (!proceso.archivos) {
            proceso.archivos = [];
          }
        });
  
        if (this.procesos.length > 0) {
          this.nombreSociedad = this.procesos[0].nombresociedad;
        } else {
          this.infoMessage = 'No se encontraron procesos para esta sociedad';
        }
  
        this.loading = false;
      });
  }
  

  editarProceso(idproceso: any) {
    this.modalService.abrirEditarProceso(idproceso);
  }


  borrarProceso(idproceso: any): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará el proceso y su carpeta en SharePoint.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.authService.acquireTokenSilent({ scopes: environment.apiConfig.scopes }).subscribe({
          next: (tokenResult) => {
            const accessToken = tokenResult.accessToken;
            console.log('Access Token:', accessToken);
  
            this.procesoService.eliminarProceso(idproceso, accessToken).subscribe({
              next: (res) => {
                console.log('Proceso eliminado:', res);
                Swal.fire({
                  icon: 'success',
                  title: 'Proceso eliminado',
                  text: 'El proceso fue eliminado correctamente.',
                  timer: 2000,
                  showConfirmButton: false
                });
                this.isLoading = false;
                this.cargarProcesos();
              },
              error: (error) => {
                this.isLoading = false;
                console.error('Error al eliminar el proceso:', error);
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: error?.error?.mensaje || 'No se pudo eliminar el proceso.'
                });
              }
            });
          },
          error: (err) => {
            this.isLoading = false;
            console.error('Error al obtener token:', err);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo obtener el token de acceso.'
            });
          }
        });
      }
    });
  }

  ordenarPor(campo: string): void {
    if (this.ordenCampo === campo) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenCampo = campo;
      this.ordenAscendente = true;
    }
  
    this.procesos.sort((a, b) => {
      let valorA = a[campo];
      let valorB = b[campo];
  
      // Manejar fechas
      if (campo === 'fecha_inicio' || campo === 'fecha_fin') {
        valorA = new Date(valorA).getTime();
        valorB = new Date(valorB).getTime();
      }
  
      // Manejar null (como en revisor_nombre)
      if (valorA === null || valorA === undefined) valorA = '';
      if (valorB === null || valorB === undefined) valorB = '';
  
      if (typeof valorA === 'string') {
        return this.ordenAscendente
          ? valorA.localeCompare(valorB)
          : valorB.localeCompare(valorA);
      } else {
        return this.ordenAscendente ? valorA - valorB : valorB - valorA;
      }
    });
  }

  abrirModalArchivos(proceso: any): void {
    this.procesoSeleccionado = proceso;
    this.mostrarModalArchivos = true;
  }
  
  cerrarModalArchivos(): void {
    this.mostrarModalArchivos = false;
    this.procesoSeleccionado = null;
  }
}
