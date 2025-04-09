/* eslint-disable @typescript-eslint/no-explicit-any */
import Swal from 'sweetalert2';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ISociedad } from 'src/models/sociedad.model';
import { ProyectoService } from 'src/services/proyecto.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProyectoEventoService } from 'src/services/proyecto-evento.service';
import {
  trigger,
  style,
  animate,
  transition,
} from '@angular/animations';
import { IUsuario } from 'src/models/user.model';
import { IEstado } from 'src/models/estado.model';
import { UserService } from 'src/services/user.service';

@Component({
  selector: 'app-crear-proceso',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './crear-proceso.component.html',
  styleUrl: './crear-proceso.component.css',
  animations: [
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
export class CrearProcesoComponent implements OnInit{
  @Output() ProcesoCreado = new EventEmitter<any>();
  @Output() cerrarModal = new EventEmitter<void>();
  

  usuarios : IUsuario[] = []
  estados: IEstado[] = [];
  sociedades: ISociedad[] = [];
  
  procesoForm!: FormGroup;
  ProyectoID!: number;
  SociedadID!: number;
  
  crearArchivoFicticio = false; //eliminar esto

  constructor(
    private fb: FormBuilder,
    private proyectoService: ProyectoService,
    private route: ActivatedRoute,
    private router : Router,
    private modalService: ProyectoEventoService,
    private userService: UserService){}
  
    
  
  ngOnInit(): void {

    const url = this.router.url;

    console.log('URL actual:', url);  


    const match = url.match(/pais\/(\d+)\/proyecto\/(\d+)\/sociedad\/(\d+)/);

    if (match) {
      const paisID = Number(match[1]);
      const proyectoID = Number(match[2]);
      const sociedadID = Number(match[3]);
  
      console.log('ID País crear proceso:', paisID);
      console.log('ID Proyecto: crear proceso', proyectoID);
      console.log('ID Sociedad: crear proceso', sociedadID);

      this.ProyectoID = proyectoID;
      this.SociedadID = sociedadID;
    
    }else{
      Swal.fire('Error', 'No se encontraron los parámetros necesarios en la URL', 'error');
      this.router.navigate(['/proyectos']);
    }

  this.initForm();
  this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.userService.obtenerUsuarios().subscribe(
      (data) => {
        this.usuarios = data;
        console.log('Usuarios:', this.usuarios);
      },
      (error) => {
        console.error('Error al cargar usuarios:', error);
      }
    )
    this.cargarEstados();
  }

  cargarEstados(): void {
    this.proyectoService.obtenerEstados().subscribe(
      (data) => {
        this.estados = data;
        console.log('Usuarios:', this.estados);
      },
      (error) => {
        console.error('Error al cargar usuarios:', error);
      }
    )
  }

  initForm(): void {
    this.procesoForm = this.fb.group({
      idSociedad: [this.SociedadID, Validators.required],
      idProyecto: [this.ProyectoID, Validators.required],
      nombreProceso: ['', Validators.required],
      fechaInicio: ['', Validators.required],
      fechaFin: [''],
      responsable: ['', Validators.required],
      revisor: [''],
      idestado: [0, Validators.required],
      crear_archivo_ficticio: [false]
    }, { validators: this.fechaFinMayorQueInicioValidator });
  }

  onSubmit(): void {
    if (this.procesoForm.valid) {
      const form = this.procesoForm.value;
  
      const procesoData = {
        idsociedad: form.idSociedad,
        idproyecto: form.idProyecto,
        nombreproceso: form.nombreProceso,
        fecha_inicio: form.fechaInicio,
        fecha_fin: form.fechaFin || null,
        responsable: form.responsable,
        revisor: form.revisor || null, // si no existe, se envía como null
        idestado: form.idestado,
        crear_archivo_ficticio: form.crear_archivo_ficticio
      };
      if (this.procesoForm.hasError('fechaFinAnterior')) {
        Swal.fire('Error', 'La fecha de fin no puede ser anterior a la fecha de inicio', 'warning');
        return;
      }
      this.proyectoService.crearProceso(procesoData).subscribe(
        (response) => {
          console.log('Proceso creado exitosamente', response);
          Swal.fire('Éxito', response.message, 'success').then(() => {
            this.ProcesoCreado.emit(response.data);
            this.cerrarModalProceso();
            this.procesoForm.reset(); // Reiniciar el formulario después de crear el proceso
          });
        },
        (error) => {
          const errorMsg = error.error?.error || 'Error al crear el proceso';
          console.error('Error al crear el proceso', error);
          Swal.fire('Error', errorMsg, 'error');
        }
      );
    } else {
      Swal.fire('Error', 'Por favor, completa todos los campos requeridos', 'warning');
    }
  }
  
  

  onCheckboxChange(event: any): void {
    this.crearArchivoFicticio = event.target.checked;
    this.procesoForm.patchValue({ crear_archivo_ficticio: this.crearArchivoFicticio });
  }
  
  cerrarModalProceso(){
    this.modalService.cerrarCrearProceso();
  }
  // Validador personalizado
fechaFinMayorQueInicioValidator(formGroup: FormGroup): Record<string, boolean> | null {
  const fechaInicio = formGroup.get('fechaInicio')?.value;
  const fechaFin = formGroup.get('fechaFin')?.value;

  if (fechaInicio && fechaFin && new Date(fechaFin) < new Date(fechaInicio)) {
    return { fechaFinAnterior: true };
  }

  return null;
}
}

