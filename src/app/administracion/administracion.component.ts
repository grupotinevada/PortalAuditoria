import { UserService } from 'src/services/user.service';
import { IUsuario } from 'src/models/user.model';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-administracion',
  imports: [CommonModule],
  templateUrl: './administracion.component.html',
  styleUrl: './administracion.component.css'
})
export class AdministracionComponent  implements OnInit{
  usuarios: IUsuario[] = []

  sortedUsuarios: IUsuario[] = [...this.usuarios];
  sortColumn: keyof IUsuario = 'idusuario';
  sortAsc = true;
constructor(private UserService: UserService){}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  private cargarUsuarios(){
    this.UserService.obtenerTodosLosUsuarios().subscribe( (res: IUsuario[]) => {
      this.usuarios = res;
      this.sortedUsuarios = [...this.usuarios];
    })
  }

  sortTable(column: keyof IUsuario): void {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }

    this.sortedUsuarios = [...this.usuarios].sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];
      if (aVal! < bVal!) return this.sortAsc ? -1 : 1;
      if (aVal! > bVal!) return this.sortAsc ? 1 : -1;
      return 0;
    });
  }

  getSortIcon(column: keyof IUsuario): string {
    if (this.sortColumn !== column) return '';
    return this.sortAsc ? '&#9650;' : '&#9660;'; // ▲▼
  }
}
