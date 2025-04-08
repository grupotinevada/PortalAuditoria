import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ISociedad  } from 'src/models/sociedad.model';
import { ProyectoService } from 'src/services/proyecto.service';
import { CommonModule } from '@angular/common';
import { BreadcrumbService } from 'src/services/breadcrumb.service';
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

  constructor(
    private route: ActivatedRoute,
    private router: Router, 
    private proyectoService: ProyectoService,
    private breadcrumbService : BreadcrumbService
  ){}


  ngOnInit(): void {

    this.cargarSociedadPorProyecto();
  }  
  cargarSociedadPorProyecto(): void {
    this.idProyecto = Number(this.route.snapshot.paramMap.get('ProyectoID'));
    if (this.idProyecto) {
      this.proyectoService.obtenerSociedades(this.idProyecto).subscribe((sociedades: ISociedad[]) => {
        this.sociedades = sociedades;
        console.log('sociedades: ', this.sociedades)
      });
      this.sociedades = this.sociedades.filter(p => p.ProyectoID === this.idProyecto);
  
    }
  
  }
  
  seleccionarSociedad(SociedadID: number) {
    this.idPais = Number(this.route.snapshot.paramMap.get('PaisID')); //obtner PaisID desde la url
    console.log('🔹 ID País:', this.idPais);
    console.log('🔹 ID Proyecto:', this.idProyecto);
    console.log('🔹 ID Sociedad:', SociedadID);
  
    if (this.idPais && this.idProyecto && SociedadID) {
      this.router.navigate(['/pais', this.idPais, 'proyecto', this.idProyecto, 'sociedad', SociedadID]);
      
    } else {
      console.error('🔴 No se ha proporcionado un parámetro válido para la navegación');
    }
  }
  
}
