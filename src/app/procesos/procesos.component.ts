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
import { Pipe, PipeTransform } from '@angular/core';
import { SpinnerComponent } from "../spinner/spinner.component";

@Pipe({
  name: 'filesize'
})
export class FileSizePipe implements PipeTransform {
  transform(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

@Component({
  selector: 'app-procesos',
  imports: [CommonModule, EditarProcesoComponent, FileSizePipe, SpinnerComponent],
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
  archivosSeleccionados: File[] = [];
  estaCerrando = false;
  archivoCopiado: string | null = null;
  
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

  abrirModalArchivos(proceso: IProceso): void {
    if (proceso.archivos && proceso.archivos.length > 1) {
      this.procesoSeleccionado = proceso;
      this.mostrarModalArchivos = true;
      this.estaCerrando = false;
    } else if (proceso.archivos && proceso.archivos.length === 1 && proceso.archivos[0].link) {
      window.open(proceso.archivos[0].link, '_blank');
    }
  }

  cerrarModalArchivos(): void {
    this.estaCerrando = true;
    // Esperar a que termine la animación antes de ocultar el sidebar
    setTimeout(() => {
      this.mostrarModalArchivos = false;
      this.estaCerrando = false;
      this.procesoSeleccionado = null;
    }, 300); // Duración de la animación en milisegundos
  }

  copiarEnlace(link: string | null, nombreArchivo: string): void {
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        this.archivoCopiado = nombreArchivo;
        // Cambiar el ícono de vuelta después de 2 segundos
        setTimeout(() => {
          this.archivoCopiado = null;
        }, 2000);
      }).catch(err => {
        console.error('Error al copiar el enlace:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo copiar el enlace al portapapeles'
        });
      });
    }
  }

  eliminarArchivo(nombreArchivo: string) {
    Swal.fire({
      title: 'Advertencia',
      text: `El archivo "${nombreArchivo}" se eliminará permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        // Confirmación adicional
        Swal.fire({
          title: '¿Estás seguro?',
          text: 'Esta acción no se puede deshacer.',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar',
          cancelButtonText: 'No'
        }).then(confirmacion => {
          if (confirmacion.isConfirmed) {
            this.isLoading = true;
            // Obtener token de acceso
            this.authService.acquireTokenSilent({ scopes: environment.apiConfig.scopes }).subscribe({
              next: (tokenResult) => {
                const accessToken = tokenResult.accessToken;
  
                this.procesoService.eliminarArchivo(this.procesoSeleccionado.idproceso, nombreArchivo, accessToken).subscribe({
                  next: () => {
                    this.isLoading = false;
                    Swal.fire('¡Eliminado!', 'El archivo fue eliminado correctamente.', 'success');
                    // Actualizar la lista de archivos del proceso
                    this.procesoSeleccionado.archivos = this.procesoSeleccionado.archivos.filter(
                      (archivo: any) => archivo.nombre !== nombreArchivo
                    );
                  },
                  error: (err) => {
                    this.isLoading = false;
                    console.error('Error al eliminar archivo:', err);
                    Swal.fire('Error', 'Hubo un problema al eliminar el archivo.', 'error');
                  }
                });
              },
              error: (err) => {
                this.isLoading = false;
                console.error('Error al adquirir token:', err);
                Swal.fire('Error de autenticación', 'No se pudo obtener el token de acceso.', 'error');
              }
            });
          }
        });
      }
    });
  }
  
  abrirArchivo(link: string | null): void {
    if (link) {
      window.open(link, '_blank');
    }
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivosSeleccionados = Array.from(input.files);
    }
  }

  eliminarArchivoDeSeleccion(archivo: File): void {
    this.archivosSeleccionados = this.archivosSeleccionados.filter(f => f !== archivo);
  }

  limpiarSeleccion(): void {
    this.archivosSeleccionados = [];
    const input = document.getElementById('nuevoArchivo') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }

  subirArchivos(): void {
    console.log('🔄 Iniciando proceso de subida de archivos...');
    console.log('📁 Archivos seleccionados:', this.archivosSeleccionados);
    console.log('📋 Proceso seleccionado:', this.procesoSeleccionado);

    if (this.archivosSeleccionados.length === 0 || !this.procesoSeleccionado) {
      console.log('❌ No se pueden subir archivos: No hay archivos seleccionados o no hay proceso seleccionado');
      return;
    }

    this.isLoading = true;
    console.log('⏳ Cargando...');
    
    const formData = new FormData();
    formData.append('nombreproceso', this.procesoSeleccionado.nombreproceso);
    formData.append('idproceso', this.procesoSeleccionado.idproceso);
    formData.append('fecha_inicio', this.procesoSeleccionado.fecha_inicio);
    formData.append('fecha_fin', this.procesoSeleccionado.fecha_fin);
    formData.append('revisor', this.procesoSeleccionado.revisor);
    formData.append('responsable', this.procesoSeleccionado.responsable);
    formData.append('idestado', this.procesoSeleccionado.idestado);
    
    // Agregar archivos al FormData
    for (const archivo of this.archivosSeleccionados) {
      formData.append('archivos', archivo);
      console.log('📤 Agregando archivo al FormData:', archivo.name);
    }

    console.log('🔑 Obteniendo token de acceso...');
    this.authService.acquireTokenSilent({ scopes: environment.apiConfig.scopes }).subscribe({
      next: (tokenResult) => {
        const accessToken = tokenResult.accessToken;
        console.log('✅ Token obtenido correctamente');
        
        console.log('🚀 Iniciando petición al servidor...');
        this.procesoService.subirArchivosProceso(this.procesoSeleccionado.idproceso, formData, true, accessToken).subscribe({
          next: (res) => {
            console.log('✅ Archivos subidos exitosamente:', res);
            this.isLoading = false;
            this.archivosSeleccionados = []; // Limpiar selección después de subir
            console.log('🧹 Selección de archivos limpiada');
            
            Swal.fire({
              icon: 'success',
              title: 'Archivos subidos',
              text: 'Los archivos se han subido correctamente.',
              timer: 2000,
              showConfirmButton: false
            });
            
            console.log('🔄 Recargando procesos...');
            this.cargarProcesos();
            console.log('🚪 Cerrando modal...');
            this.cerrarModalArchivos();
          },
          error: (err) => {
            console.error('❌ Error al subir archivos:', err);
            this.isLoading = false;
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudieron subir los archivos.'
            });
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al obtener token:', err);
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo obtener el token de acceso.'
        });
      }
    });
  }
}
