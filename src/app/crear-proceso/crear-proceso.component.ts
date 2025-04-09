/* eslint-disable @typescript-eslint/no-explicit-any */
import Swal from 'sweetalert2';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ISociedad } from 'src/models/sociedad.model';
import { ProyectoService } from 'src/services/proyecto.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-crear-proceso',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './crear-proceso.component.html',
  styleUrl: './crear-proceso.component.css'
})
export class CrearProcesoComponent implements OnInit{
  @Output() ProcesoCreado = new EventEmitter<any>();
  @Output() cerrarModal = new EventEmitter<void>();

  procesoForm!: FormGroup;
  sociedades: ISociedad[] = [];
  ProyectoID!: number;
  SociedadID!: number;
  crearArchivoFicticio = false; //eliminar esto

  constructor(
    private fb: FormBuilder,
    private proyectoService: ProyectoService,
    private route: ActivatedRoute,
    private router : Router){}
    
  
  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.ProyectoID = Number(params.get('ProyectoID'));
      this.SociedadID = Number(params.get('SociedadID'));
    });
    this.initForm();
  
  }

  initForm(): void {
    this.procesoForm = this.fb.group({
      idSociedad:[this.SociedadID, Validators.required],
      idProyecto: [this.ProyectoID, Validators.required],
      nombreProceso: ['', Validators.required],
      fechaInicio: ['', Validators.required],
      fechaFin: [''],
      responsable: ['', Validators.required],
      idestado: [0, Validators.required],
      crear_archivo_ficticio: [false]
    });
  }

  onSubmit(): void {
    if (this.procesoForm.valid) {
      const procesoData = this.procesoForm.value;
      this.proyectoService.crearProyecto(procesoData).subscribe({
        next: (procesoData) => {
          this.ProcesoCreado.emit(procesoData);
          this.cerrarModal.emit();
          Swal.fire({
            icon: 'success',
            title: 'Proceso creado exitosamente',
            showConfirmButton: false,
            timer: 1500
          });
        },
        error: (error) => {
          this.cerrarModal.emit();
          Swal.fire({
            icon: 'error',
            title: 'Error al crear el proceso',
            text: error.error?.message || 'Error desconocido',
            showConfirmButton: true
          });
          console.error('Error al crear el proceso:', error);
        }
      });
    }
  }
  

  onCheckboxChange(event: any): void {
    this.crearArchivoFicticio = event.target.checked;
    this.procesoForm.patchValue({ crear_archivo_ficticio: this.crearArchivoFicticio });
  }
  
}

