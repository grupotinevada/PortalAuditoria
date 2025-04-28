/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/services/user.service';
import { IPais } from 'src/models/pais.model';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProyectoService } from 'src/services/proyecto.service';

@Component({
  selector: 'app-pais',
  imports: [CommonModule],
  templateUrl: './pais.component.html',
  styleUrl: './pais.component.css'
})

export class PaisComponent implements OnInit{

  paisesCargados = false;
  proyectosCargados = false;
  paises: IPais[] = [];
  totalProyectos = 0;
  totalPaises = 0;
  paisSeleccionado: any = null;
  archivosCargados: any[] = [];

  constructor(
    private userService: UserService,
    private router: Router,
    private proyectoService: ProyectoService
  ){}
  ngOnInit(): void {
    this.userService.obtenerPaises().subscribe({
          next: (response: IPais[]) => {
            this.paises = response;
          },
          error: (error) => {
            console.error('Error al obtener los países:', error);
          }
        });
        this.contadorProyectos();
  }
  
  seleccionarPais(idpais: number | string | null) {
    this.router.navigate(['/pais', idpais]);
  }
  contarProyectosPorPais() {
    
    if (!this.archivosCargados || !this.paises) {
      
      return;
    }
  
   
  
    const conteo: Record<number, number> = {};
  
    this.archivosCargados.forEach((proyecto: any) => {
     
      const id = proyecto.idpais;
      conteo[id] = (conteo[id] || 0) + 1;
     
    });
  
    this.paises = this.paises.map((pais: any) => {
      const cantidad = conteo[pais.idpais] || 0;
    
      return {
        ...pais,
        cantidadProyectos: cantidad,
      };
    });
  
  }
  

  contadorProyectos() {
    this.contadorPaises();
    this.proyectoService.obtenerTotalDeProyectos().subscribe({
      next: (response: any[]) => {

        this.totalProyectos = response.length;
        this.archivosCargados = response;
  
        // Si los países ya están cargados, ahora sí contamos los proyectos por país
        if (this.paises?.length) {
          this.contarProyectosPorPais();
        }
      },
      error: (err) => {
        console.error('Error al obtener todos los proyectos', err);
        this.totalProyectos = 0;
      },
    });
 // sigue siendo llamada
  }

  contadorPaises() {
    this.userService.obtenerPaises().subscribe({
      next: (response: any[]) => {
        console.log('Total de Paises:', response.length);
        this.totalPaises = response.length;
        this.paises = response;
  
        // Si los proyectos ya están cargados, ahora sí contamos los proyectos por país
        if (this.archivosCargados?.length) {
          this.contarProyectosPorPais();
        }
      },
      error: (err) => {
        console.error('Error al obtener todos los Paises', err);
        this.totalPaises = 0;
      },
    });
  }
}

