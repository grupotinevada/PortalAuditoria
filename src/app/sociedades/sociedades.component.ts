import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ISociedad  } from 'src/models/sociedad.model';
import { ProyectoService } from 'src/services/proyecto.service';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-sociedades',
  imports: [CommonModule],
  templateUrl: './sociedades.component.html',
  styleUrl: './sociedades.component.css'
})
export class SociedadesComponent implements OnInit{
  idPais!: number;
  idProyecto!: number;
  sociedades: ISociedad[] = [];

  constructor(private route: ActivatedRoute,private router: Router, private proyectoService: ProyectoService){}


  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      // Obtener valores de los parámetros de la URL
      this.idPais = Number(params.get('PaisID'));
      this.idProyecto = Number(params.get('ProyectoID'));
      
      // Agregar un console.log para ver los parámetros
      console.log('🔹 Parámetros obtenidos:', params);
  
      // Iterar sobre las claves de los parámetros para ver sus valores
      params.keys.forEach(key => {
        console.log(`🔹 ${key}: ${params.get(key)}`);
      });
  
      // Validar si idProyecto es un número válido
      if (isNaN(this.idProyecto) || !this.idProyecto) {
        console.warn('⚠️ No se proporcionó un ID de proyecto válido.');
        return;
      }
  
      console.log('🔹 ID del País:', this.idPais);
      console.log('🔹 ID del Proyecto:', this.idProyecto);
  
      // Llamar al servicio para obtener las sociedades
      this.proyectoService.obtenerSociedades(this.idProyecto).subscribe((sociedades: ISociedad[]) => {
        console.log('✅ Sociedades obtenidas del servicio:', sociedades);
        this.sociedades = sociedades;
        //console.log('✅ Sociedades filtradas:', this.sociedades);
      }, error => {
        console.error('❌ Error al obtener sociedades:', error);
      });
      
    });
  }  
  
  seleccionarSociedad(idSociedad: number) {
    console.log('🔹 ID País:', this.idPais);
    console.log('🔹 ID Proyecto:', this.idProyecto);
    console.log('🔹 ID Sociedad:', idSociedad);
  
    if (this.idPais && this.idProyecto && idSociedad) {
      this.router.navigate(['/pais', this.idPais, 'proyecto', this.idProyecto, 'sociedad', idSociedad]);
    } else {
      console.error('🔴 No se ha proporcionado un parámetro válido para la navegación');
    }
  }
  
}
