/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare var bootstrap: any;
import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IEstado } from 'src/models/estado.model';
import { IArchivo, IProceso } from 'src/models/proceso.model';
import { IUsuario } from 'src/models/user.model';
import { ProcesoService } from 'src/services/proceso.service';
import { ProyectoEventoService } from 'src/services/proyecto-evento.service';
import { ProyectoService } from 'src/services/proyecto.service';
import { UserService } from 'src/services/user.service';
import { SpinnerComponent } from '../spinner/spinner.component';
import Swal from 'sweetalert2';
import { MsalService } from '@azure/msal-angular';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-editar-proceso',
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent],
  templateUrl: './editar-proceso.component.html',
  styleUrl: './editar-proceso.component.css',animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ]),
  ]
})


export class EditarProcesoComponent implements OnInit, AfterViewInit {
  @Input() idProceso: IProceso | number | null = null ;
  @Output() procesoEditado = new EventEmitter<IProceso>();

  archivosSeleccionados: File[] = [];
  archivosSubidos: IArchivo[] = [];


  editarProcesoForm!: FormGroup;
  procesoSeleccionado!: IProceso;
  isLoading = false;
  usuarios: IUsuario[] = [];
  estados: IEstado[] = [];
  constructor(
    private modalService: ProyectoEventoService,
    private procesoService: ProcesoService,
    private fb: FormBuilder,
    private userService: UserService,
    private proyectoService: ProyectoService,
    private authService: MsalService
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.cargarUsuarios();
  }


  cargar() {
    if (this.idProceso) {
      console.log('Cargando proceso con ID:', this.idProceso);
      this.procesoService.obtenerProcesoPorId(Number(this.idProceso)).subscribe({
        next: (proceso: IProceso) => {
          console.log('✨Proceso recibido:', proceso);
          console.log('Archivos en el proceso:', proceso.archivos);
          this.inicializarFormulario(proceso);
        },
        error: (err) => console.error('Error al cargar proceso', err)
      });
    }
  }
  

  ngAfterViewInit() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach((tooltipTriggerEl) => {
      new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  inicializarFormulario(proceso: IProceso) {
    this.editarProcesoForm = this.fb.group({
      nombreproceso: [proceso.nombreproceso],
      fecha_inicio: [proceso.fecha_inicio?.toString().slice(0, 10)],
      fecha_fin: [proceso.fecha_fin?.toString().slice(0, 10)],
      responsable: [proceso.responsable],
      revisor: [proceso.revisor],
      idestado: [proceso.idestado],
      archivos: this.fb.array(proceso.archivos?.map(archivo => 
        this.fb.group({
          nombre: [archivo.nombre],
          link: [archivo.link]
        })) || [])
    });
    console.log('🔹 Archivos subidos:', this.archivosSubidos);

    // Guardar los archivos subidos
    this.archivosSubidos = proceso.archivos || [];
  }
  


  onSubmit() {
    if (this.editarProcesoForm.invalid) {
      Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Por favor, completa todos los campos obligatorios.',
      });
      return;
    }
  
    Swal.fire({
      title: '¿Actualizar proceso?',
      text: 'Los cambios se guardarán permanentemente.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, actualizar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (!result.isConfirmed) return;
  
      const formValues = this.editarProcesoForm.value;
      const formData = new FormData();
  
      formData.append('nombreproceso', formValues.nombreproceso);
      formData.append('fecha_inicio', formValues.fecha_inicio);
      formData.append('fecha_fin', formValues.fecha_fin);
      formData.append('responsable', formValues.responsable);
      formData.append('revisor', formValues.revisor);
      formData.append('idestado', formValues.idestado);
  
      this.authService.acquireTokenSilent({ scopes: environment.apiConfig.scopes }).subscribe({
        next: async (tokenResult) => {
          const accessToken = tokenResult.accessToken;
          const archivos = this.archivosSeleccionados;
          const nombresExistentes = this.archivosSubidos.map(a => a.nombre);
          const archivosAEnviar: File[] = [];
  
          for (const archivo of archivos) {
            if (nombresExistentes.includes(archivo.name)) {
              const confirm = await Swal.fire({
                title: `¿Reemplazar archivo "${archivo.name}"?`,
                text: 'Este archivo ya existe. ¿Deseas reemplazarlo?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, reemplazar',
                cancelButtonText: 'No subir'
              });
  
              if (confirm.isConfirmed) {
                archivosAEnviar.push(archivo);
              }
            } else {
              archivosAEnviar.push(archivo);
            }
          }
  
          // Agregar archivos al FormData
          for (const archivo of archivosAEnviar) {
            formData.append('archivos', archivo); // plural
          }
  
          this.isLoading = true;
  
          this.procesoService.actualizarProceso(this.idProceso, formData, archivosAEnviar.length > 0, accessToken).subscribe({
            next: (res) => {
              this.modalService.notificarProcesoEditado();
              Swal.fire({
                icon: 'success',
                title: 'Proceso actualizado',
                text: res.mensaje || 'El proceso se actualizó correctamente.',
              });
              this.cerrarModalEditar();
              this.isLoading = false;
            },
            error: (err) => {
              this.isLoading = false;
              console.error('❌ Error al actualizar el proceso:', err);
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.error?.error || 'Ocurrió un error al intentar actualizar el proceso.',
              });
            }
          });
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error al obtener token:', err);
          Swal.fire('Error de autenticación', 'No se pudo obtener el token de acceso.', 'error');
        }
      });
    });
  }
  
  
  
  
  cerrarModalEditar() {
    this.modalService.cerrarEditarProceso();
  }
  
  
  
  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivosSeleccionados = Array.from(input.files);
    } else {
      this.archivosSeleccionados = [];
    }
  }

  
  cargarUsuarios(): void {
    this.isLoading = true;
    this.userService.obtenerUsuariosFiltrados().subscribe(
      (data) => {
        const correosExcluidos = ['maguilera@inevada.cl', 'isalazar@inevada.cl', 'tecnologia@inevada.cl'];
        this.usuarios = data.filter((usuario: IUsuario) =>
          !correosExcluidos.includes(usuario.correo)
        );
        console.log('Usuarios filtrados:', this.usuarios);
        this.isLoading = false;
      },
      (error) => {
        this.isLoading = false;
        console.error('Error al cargar usuarios:', error);
      }
    );
    this.cargarEstados();
  }

  cargarEstados(): void {
    this.isLoading = true;
    this.proyectoService.obtenerEstados().subscribe(
      (data) => {
        this.estados = data;
        console.log('Usuarios:', this.estados);
        this.isLoading = false;
      },
      (error) => {
        this.isLoading = false;
        console.error('Error al cargar usuarios:', error);
      }
    )
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
  
                this.procesoService.eliminarArchivo(this.idProceso, nombreArchivo, accessToken).subscribe({
                  next: () => {
                    this.isLoading = false;
                    Swal.fire('¡Eliminado!', 'El archivo fue eliminado correctamente.', 'success');
                    //this.cerrarModalEditar();
                    this.cargar();
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
  
}