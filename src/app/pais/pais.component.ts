import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/services/user.service';
import { IPais } from 'src/models/pais.model';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pais',
  imports: [CommonModule],
  templateUrl: './pais.component.html',
  styleUrl: './pais.component.css'
})

export class PaisComponent implements OnInit{

  paises: IPais[] = [];

  constructor(
    private userService: UserService,
    private router: Router
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
  }
  
  seleccionarPais(idpais: number | string | null) {
    this.router.navigate(['/pais', idpais]);
  }
}
