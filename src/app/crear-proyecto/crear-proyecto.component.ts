/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, FormControl} from '@angular/forms';
import { ProyectoService } from 'src/services/proyecto.service';
import { IProyecto } from 'src/models/proyecto.model';
import { CommonModule } from '@angular/common';
import { IUsuario } from 'src/models/user.model';

@Component({
  selector: 'app-crear-proyecto',
  templateUrl: './crear-proyecto.component.html',
  styleUrls: ['./crear-proyecto.component.css'],
  imports: [ReactiveFormsModule,CommonModule]
})
export class CrearProyectoComponent implements OnInit{
  @Output() proyectoCreado = new EventEmitter<any>();
  @Output() cerrarModal = new EventEmitter<void>();
  @Input() paisId!: number; // Asegúrate de tener este decorador

  proyectoForm!: FormGroup;
  profile: IUsuario | null = null;
  sociedades: any[] = [];
  isLoading = false;
  errorMessage = '';
  //paisId!: number; // ID del país que se pasa al componente

  constructor(
    private fb: FormBuilder,
    private proyectoService: ProyectoService
  ){}

    ngOnInit(): void {
      this.initForm();
      this.cargarSociedades();
      setTimeout(() => {
        this.setFocus();
      }, 0);
    }
  
    initForm(): void {
      this.proyectoForm = this.fb.group({
        nombre: ['', Validators.required],
        descripcion: [''],
        fechaInicio: ['', Validators.required],
        fechaFin: [''],
        sociedades: this.fb.array([]) // Inicializa el FormArray
      });
    }

    cargarSociedades(): void {
      if (this.paisId) {
        this.proyectoService.ObtenerSociedadesPorPais(this.paisId).subscribe({
          next: (data) => {
            this.sociedades = data;
            console.log('Sociedades:', this.sociedades);
            this.actualizarCheckboxes();
          },
          error: (error) => {
            console.error('Error al cargar sociedades:', error);
          }
        });
      }
    }
    
    actualizarCheckboxes(): void {
      const sociedadesArray = this.proyectoForm.get('sociedades') as FormArray;
      sociedadesArray.clear();
      
      this.sociedades.forEach(() => {
        sociedadesArray.push(this.fb.control(false));
      });
    }

    get sociedadesFormArray(): FormArray {
      return this.proyectoForm.get('sociedades') as FormArray;
    }

    getSociedadControl(index: number): FormControl {
      return this.sociedadesFormArray.at(index) as FormControl;
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
        this.getProfile();

        // Obtener IDs de sociedades seleccionadas
        const sociedadesSeleccionadas = this.proyectoForm.value.sociedades
        .map((checked: boolean, i: number) => checked ? this.sociedades[i].idsociedad : null)
        .filter((v: any) => v !== null);

        console.log('Sociedades seleccionadas:', sociedadesSeleccionadas);
  
        const proyectoData: IProyecto = {
          idpais: this.paisId,
          idusuario: this.profile?.idusuario || null, // ID del usuario autenticado
          nombreproyecto: this.proyectoForm.get('nombre')?.value,
          fecha_inicio: this.proyectoForm.get('fechaInicio')?.value,
          fecha_termino: this.proyectoForm.get('fechaFin')?.value,
          habilitado: 1,
          sociedadesSeleccionadas: sociedadesSeleccionadas, // Añadir sociedades seleccionadas
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