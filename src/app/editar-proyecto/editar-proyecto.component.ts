// editar-proyecto.component.ts
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IProyecto } from 'src/models/proyecto.model';
import { ISociedad } from 'src/models/sociedad.model';
import { ProyectoService } from 'src/services/proyecto.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editar-proyecto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './editar-proyecto.component.html',
  styleUrls: ['./editar-proyecto.component.css']
})
export class EditarProyectoComponent implements OnInit, OnChanges {
  @Input() proyecto!: IProyecto;
  @Output() guardarCambios = new EventEmitter<IProyecto>();
  @Output() cancelar = new EventEmitter<void>();
  @Output() eliminar = new EventEmitter<number>();
  
  proyectoForm: FormGroup;
  sociedades: ISociedad[] = [];
  sociedadesSeleccionadas: ISociedad[] = [];
  cargandoSociedades = false;
  mostrarModalConfirmacion = false;

  constructor(
    private fb: FormBuilder,
    private proyectoService: ProyectoService
  ) {
    this.proyectoForm = this.fb.group({
      nombreproyecto: ['', Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_termino: ['', Validators.required],
      sociedades: this.fb.array([]),
      habilitado: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarSociedades();
  }

  ngOnChanges(): void {
    if (this.proyecto) {
      this.inicializarFormulario();
      this.cargarSociedades();
    }
  }

  get sociedadesFormArray(): FormArray {
    return this.proyectoForm.get('sociedades') as FormArray;
  }

  inicializarFormulario(): void {
    // Transforma las fechas de string a formato de fecha para el input
    const fechaInicio = this.proyecto.fecha_inicio ? new Date(this.proyecto.fecha_inicio).toISOString().split('T')[0] : '';
    const fechaTermino = this.proyecto.fecha_termino ? new Date(this.proyecto.fecha_termino).toISOString().split('T')[0] : '';
    
    this.proyectoForm.patchValue({
      nombreproyecto: this.proyecto.nombreproyecto,
      fecha_inicio: fechaInicio,
      fecha_termino: fechaTermino,
      habilitado: this.proyecto.habilitado === 1
    });
  }

  cargarSociedades(): void {
    if (this.proyecto && this.proyecto.idproyecto !== null && this.proyecto.idproyecto !== undefined && this.proyecto.idpais) {
      this.cargandoSociedades = true;
      
      // Primero, cargar todas las sociedades del país
      this.proyectoService.ObtenerSociedadesPorPais(this.proyecto.idpais).subscribe({
        next: (todasSociedades) => {
          this.sociedades = todasSociedades;
          
          // Luego, cargar las sociedades asociadas al proyecto
          this.proyectoService.obtenerSociedades(Number(this.proyecto.idproyecto)).subscribe({
            next: (sociedadesProyecto) => {
              this.sociedadesSeleccionadas = Array.isArray(sociedadesProyecto) ? sociedadesProyecto : [];
              this.actualizarCheckboxes();
              this.cargandoSociedades = false;
            },
            error: (error) => {
              console.error('Error al cargar sociedades del proyecto:', error);
              this.cargandoSociedades = false;
            }
          });
        },
        error: (error) => {
          console.error('Error al cargar sociedades del país:', error);
          this.cargandoSociedades = false;
        }
      });
    }
  }

  actualizarCheckboxes(): void {
    // Limpiar el FormArray actual
    while (this.sociedadesFormArray.length !== 0) {
      this.sociedadesFormArray.removeAt(0);
    }
  
    console.log('Sociedades disponibles:', this.sociedades);
    console.log('Sociedades seleccionadas previamente:', this.sociedadesSeleccionadas);
  
    // Crear nuevos controles para cada sociedad
    this.sociedades.forEach(sociedad => {
      const estaSeleccionada = this.sociedadesSeleccionadas.some(
        s => s.idsociedad === sociedad.idsociedad
      );
      //console.log(`Sociedad ${sociedad.nombresociedad} (ID: ${sociedad.idsociedad}) - Seleccionada: ${estaSeleccionada}`);
      this.sociedadesFormArray.push(this.fb.control(estaSeleccionada));
    });
  
    //console.log('Estado inicial de checkboxes:', this.sociedadesFormArray.value);
  }

  guardar(): void {
    if (this.proyectoForm.valid) {
      // Obtener todos los valores actuales del formulario
      const formValues = this.proyectoForm.value;
      
      // Extraer las sociedades del formArray actual (los checkboxes)
      const sociedadesSeleccionadasActuales = this.sociedadesFormArray.controls
        .map((control, index) => ({ 
          selected: control.value, 
          sociedad: this.sociedades[index] 
        }))
        .filter(item => item.selected)
        .map(item => item.sociedad.idsociedad);
      
      console.log('Estado actual de checkboxes:', this.sociedadesFormArray.value);
      console.log('Sociedades seleccionadas actuales:', sociedadesSeleccionadasActuales);

      console.log('Valores del formulario:', formValues);
      
      const proyectoActualizado: IProyecto = {
        ...this.proyecto,
        nombreproyecto: formValues.nombreproyecto,
        fecha_inicio: formValues.fecha_inicio,
        fecha_termino: formValues.fecha_termino,
        habilitado: formValues.habilitado ? 1 : 0,
        // No incluimos el formArray de sociedades directamente
      };
  
      // Crear el objeto final con los IDs de sociedades actualizados
      const datosCompletos = {
        ...proyectoActualizado,
        idusuario: this.proyecto.idusuario,
        sociedadesSeleccionadas: sociedadesSeleccionadasActuales
      };
  
      console.log('Proyecto actualizado final:', proyectoActualizado);
      console.log('Datos completos a enviar:', datosCompletos);
  
      this.guardarCambios.emit(datosCompletos);
    }
  }
  onCheckboxChange(index: number, event: any): void {
    //console.log(`Checkbox ${index} cambió a: ${event.target.checked}`);
    this.sociedadesFormArray.at(index).setValue(event.target.checked);    
    //console.log('Estado actual de todos los checkboxes:', this.sociedadesFormArray.value);
  }

  onCancelar(): void {
    this.cancelar.emit();
  }

  abrirModalConfirmacion(): void {
    Swal.fire({
      title: '¿Está seguro(a)?',
      html: 'Esta acción eliminará el proyecto <b>'+this.proyecto.nombreproyecto+'</b> de forma permanente.',
      //text: 'Esta acción eliminará el proyecto '+this.proyecto.nombreproyecto+' de forma permanente.',
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.confirmarEliminacion();
      }
    });
  }

  cerrarModalConfirmacion(): void {
    this.mostrarModalConfirmacion = false;
  }

  confirmarEliminacion(): void {
    if (this.proyecto && this.proyecto.idproyecto) {
      console.log('Eliminando proyecto:', this.proyecto.idproyecto);
      this.eliminar.emit(this.proyecto.idproyecto);
      this.cerrarModalConfirmacion();
    }
  }

}