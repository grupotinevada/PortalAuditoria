import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProyectoService } from 'src/services/proyecto.service';
import { IProyecto } from 'src/models/proyecto.model';
import { NgIf, NgFor, CommonModule } from '@angular/common';
import { IUsuario } from 'src/models/user.model';

@Component({
  selector: 'app-crear-proyecto',
  templateUrl: './crear-proyecto.component.html',
  styleUrls: ['./crear-proyecto.component.css'],
  imports: [ReactiveFormsModule,CommonModule]
})
export class CrearProyectoComponent {
  @Output() proyectoCreado = new EventEmitter<any>();
  @Output() cerrarModal = new EventEmitter<void>();
  @Input() paisId!: number; // Asegúrate de tener este decorador

  proyectoForm!: FormGroup;
  profile: IUsuario | null = null;
  
  isLoading = false;
  errorMessage = '';
  //paisId!: number; // ID del país que se pasa al componente

  constructor(
    private fb: FormBuilder,
    private proyectoService: ProyectoService
  ){}

    ngOnInit(): void {
      this.initForm();
      setTimeout(() => {
        this.setFocus();
      }, 0);
    }
  
    initForm(): void {
      this.proyectoForm = this.fb.group({
        nombre: ['', Validators.required],
        descripcion: [''],
        fechaInicio: ['', Validators.required],
        fechaFin: ['']
      });
    }
  
    setFocus(): void {
      const element = document.getElementById('nombreInput');
      if (element) {
        element.focus();
      }
    }

      getProfile() {
        const userData = sessionStorage.getItem('userData');
        if (userData) {
          console.log('data', userData)
          this.profile = JSON.parse(userData) as IUsuario;
        } else {
          this.profile = null;
        }
      }
  
    onSubmit(): void {
      if (this.proyectoForm.valid && this.paisId) {
        this.isLoading = true;
        this.errorMessage = '';
  
        const proyectoData: IProyecto = {
          idpais: this.paisId,
          nombreproyecto: this.proyectoForm.get('nombre')?.value,
          fecha_inicio: this.proyectoForm.get('fechaInicio')?.value,
          fecha_termino: this.proyectoForm.get('fechaFin')?.value,
          habilitado: 1, // Por defecto habilitado
          // Campos opcionales
          nombrepais: null,
          cod: null,
          nombreUsuario: null,
          correo: null,
          idproyecto: null
        };
  
        this.proyectoService.crearProyecto(proyectoData).subscribe({
          next: (proyecto) => {
            this.proyectoCreado.emit(proyecto);
            this.isLoading = false;
            this.cerrarModal.emit();
          },
          error: (error) => {
            this.errorMessage = error.error?.message || 'Error al crear el proyecto';
            this.isLoading = false;
            console.error('Error creando proyecto:', error);
          }
        });
      }
    }
  
    onCancel(): void {
      this.cerrarModal.emit();
    }
  }