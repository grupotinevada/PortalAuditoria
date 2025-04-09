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
  nombrePais: string | null = null;

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
        // Primero guarda todos los proyectos que vienen del servicio
        const todosProyectos = proyectos;
        console.log('proyectos recibidos: ', todosProyectos);
        
        // Luego filtra por el idPais
        this.proyectos = todosProyectos.filter(p => p.idpais === this.idPais);
        console.log('proyectos filtrados: ', this.proyectos);
      });
    }

  }

seleccionarProyecto(idProyecto: number | null) {
  this.router.navigate(['/pais', this.idPais, 'proyecto', idProyecto]);
}





}
