import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProyectoService } from '../../services/proyecto.service';
import { CommonModule } from '@angular/common';
import { IProyecto } from 'src/models/proyecto.model';

@Component({
  selector: 'app-proyecto',
  imports: [CommonModule],
  templateUrl: './proyecto.component.html',
  styleUrl: './proyecto.component.css'
})
export class ProyectoComponent implements OnInit{
  idPais!: number;
  proyectos: IProyecto[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private proyectoService: ProyectoService
  ) {}

  ngOnInit(): void {
    this.cargarProyectosPorPais();
  }


private cargarProyectosPorPais(): void {
  this.idPais = Number(this.route.snapshot.paramMap.get('PaisID'));
  if (this.idPais) {
    this.proyectoService.obtenerProyectosPorPais(this.idPais).subscribe((proyectos: IProyecto[]) => {
      this.proyectos = proyectos;
      console.log('proyecto: ', this.proyectos)
    });
    this.proyectos = this.proyectos.filter(p => p.idpais === this.idPais);

  }

}

seleccionarProyecto(idProyecto: number | null) {
  this.router.navigate(['/pais', this.idPais, 'proyecto', idProyecto]);
}

}
