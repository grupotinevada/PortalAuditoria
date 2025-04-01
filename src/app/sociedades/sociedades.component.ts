import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ISociedad  } from 'src/models/sociedad.model';
import { ProyectoService } from 'src/services/proyecto.service';
@Component({
  selector: 'app-sociedades',
  imports: [],
  templateUrl: './sociedades.component.html',
  styleUrl: './sociedades.component.css'
})
export class SociedadesComponent implements OnInit{
  idPais!: number;
  idProyecto!: number;
  sociedades: ISociedad[] = [];

  constructor(private route: ActivatedRoute,private router: Router, private proyectoService: ProyectoService){}


  ngOnInit(): void {
    this.idPais = Number(this.route.snapshot.paramMap.get('idPais'));
    this.idProyecto = Number(this.route.snapshot.paramMap.get('idProyecto'));
     if (this.idProyecto) {
        this.proyectoService.obtenerSociedades().subscribe((sociedades: ISociedad[]) => {
          this.sociedades = sociedades;
          console.log('proyecto: ', this.sociedades)
        });
        this.sociedades = this.sociedades.filter(s => s.ProyectoID === this.idProyecto);
    
      }
  }

  seleccionarSociedad(idSociedad: number) {
    this.router.navigate(['/pais', this.idPais, 'proyecto', this.idProyecto, 'sociedad', idSociedad]);
  }
}
