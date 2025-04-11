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
import { MsalService } from '@azure/msal-angular';
import { environment } from 'src/environments/environment';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'app-crear-proceso',
  imports: [ReactiveFormsModule, CommonModule, SpinnerComponent],
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
  
  crearArchivo = false; 
  archivoSeleccionado: File | null = null;

  isLoading = false;
  constructor(
    private fb: FormBuilder,
    private proyectoService: ProyectoService,
    private route: ActivatedRoute,
    private router : Router,
    private modalService: ProyectoEventoService,
    private userService: UserService,
    private authService: MsalService){}
  
    
  
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
      crear_archivo_en_blanco: [false]
    }, { validators: this.fechaFinMayorQueInicioValidator });
  }
  

  onSubmit(): void {
    if (this.procesoForm.valid) {
      const form = this.procesoForm.value;
      this.isLoading=true;
      // Validaciones cruzadas
      if (form.crear_archivo_en_blanco && this.archivoSeleccionado) {
        this.isLoading = false;
        Swal.fire('Error', 'No puede subir un archivo y seleccionar "Crear archivo en blanco"', 'warning');
        return;
      }
  
      if (!form.crear_archivo_en_blanco && !this.archivoSeleccionado) {
        this.isLoading = false;
        Swal.fire('Error', 'Debe subir un archivo si no selecciona "Crear archivo en blanco"', 'warning');
        return;
      }
  
      if (this.procesoForm.hasError('fechaFinAnterior')) {
        this.isLoading = false;
        Swal.fire('Error', 'La fecha de fin no puede ser anterior a la fecha de inicio', 'warning');
        return;
      }
  
      // Obtener accessToken
      this.authService.acquireTokenSilent({ scopes: environment.apiConfig.scopes }).subscribe((result) => {
        const accessToken = result.accessToken;
        console.log('Access Token:', accessToken);
        // Armar FormData
        const formData = new FormData();
        formData.append('idsociedad', form.idSociedad);
        formData.append('idproyecto', form.idProyecto);
        formData.append('nombreproceso', form.nombreProceso);
        formData.append('fecha_inicio', form.fechaInicio);
        formData.append('fecha_fin', form.fechaFin || '');
        formData.append('responsable', form.responsable);
        formData.append('revisor', form.revisor || '');
        formData.append('idestado', form.idestado);
        formData.append('crear_archivo_en_blanco', form.crear_archivo_en_blanco.toString());
  
        if (this.archivoSeleccionado && !form.crear_archivo_en_blanco) {
          formData.append('archivo', this.archivoSeleccionado);
        }
  
        // Llamar servicio con token en header
        this.proyectoService.crearProceso(formData, accessToken).subscribe(
          (res) => {
            console.log('Proceso creado exitosamente', res);
            Swal.fire('Éxito', res.message, 'success').then(() => {
              this.ProcesoCreado.emit(res.data);
              this.modalService.notificarProcesoCreado(); // envio la notificacion al servicio
              this.cerrarModalProceso();
              this.procesoForm.reset();
              this.archivoSeleccionado = null;
            });
            this.isLoading = false;
          },
          (error) => {
            this.isLoading = false;
            const errorMsg = error.error?.error || 'Error al crear el proceso';
            console.error('Error al crear el proceso', error);
            Swal.fire('Error', errorMsg, 'error');
          }
        );
      });
    } else {
      this.isLoading = false;
      Swal.fire('Error', 'Por favor, completa todos los campos requeridos', 'warning');
    }
  }
  
  

  onCheckboxChange(event: any): void {
    this.crearArchivo = event.target.checked;
    this.procesoForm.patchValue({ crear_archivo_en_blanco: this.crearArchivo });
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

onFileSelected(event: any): void {
  const file: File = event.target.files[0];
  if (file) {
    this.archivoSeleccionado = file;
    console.log('Archivo seleccionado:', file.name);
  } else {
    this.archivoSeleccionado = null;
  }
}

}

