import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IEstado } from 'src/models/estado.model';
import { IProceso } from 'src/models/proceso.model';
import { IUsuario } from 'src/models/user.model';
import { ProcesoService } from 'src/services/proceso.service';
import { ProyectoEventoService } from 'src/services/proyecto-evento.service';
import { ProyectoService } from 'src/services/proyecto.service';
import { UserService } from 'src/services/user.service';
import { SpinnerComponent } from '../spinner/spinner.component';
import Swal from 'sweetalert2';

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
export class EditarProcesoComponent implements OnInit {
  @Input() idProceso: IProceso | number | null = null ;
  @Output() procesoEditado = new EventEmitter<IProceso>();

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
    private proyectoService: ProyectoService
  ) {}

  ngOnInit(): void {
    console.log('aaaaaa ID del proceso a editar:', this.idProceso);
    if (this.idProceso) {
      this.procesoService.obtenerProcesoPorId(Number(this.idProceso)).subscribe({
        next: (proceso) => this.inicializarFormulario(proceso),
        error: (err) => console.error('Error al cargar proceso', err)
      });
    }
    this.cargarUsuarios();
  }

  inicializarFormulario(proceso: IProceso) {
    this.editarProcesoForm = this.fb.group({
      nombreproceso: [proceso.nombreproceso],
      fecha_inicio: [proceso.fecha_inicio?.toString().slice(0, 10)],
      fecha_fin: [proceso.fecha_fin?.toString().slice(0, 10)],
      responsable: [proceso.responsable], 
      revisor: [proceso.revisor],         
      idestado: [proceso.idestado],
    });
    
  }
  onSubmit() {
    if (this.editarProcesoForm.invalid ) {
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
      if (result.isConfirmed) {
        this.isLoading = true;
        const datosActualizados: IProceso = this.editarProcesoForm.value;
        this.procesoService.actualizarProceso(this.idProceso, datosActualizados).subscribe({
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
              text: 'Ocurrió un error al intentar actualizar el proceso.',
            });
          }
        });
      }
    });
  }
  
  

  cerrarModalEditar() {
    this.modalService.cerrarEditarProceso();
  }

  
  cargarUsuarios(): void {
    this.isLoading = true;
    this.userService.obtenerUsuarios().subscribe(
      (data) => {
        this.usuarios = data;
        console.log('Usuarios:', this.usuarios);
        this.isLoading = false;
      },
      (error) => {
        this.isLoading = false;
        console.error('Error al cargar usuarios:', error);
      }
    )
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

  
}