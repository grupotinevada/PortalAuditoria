/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/array-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserService } from 'src/services/user.service';
import { IUsuario } from 'src/models/user.model';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProyectoEventoService } from 'src/services/proyecto-evento.service';
import { SpinnerComponent } from '../spinner/spinner.component';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { MsalService } from '@azure/msal-angular';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-administracion',
  imports: [CommonModule, SpinnerComponent, FormsModule],
  templateUrl: './administracion.component.html',
  styleUrl: './administracion.component.css'
})
export class AdministracionComponent  implements OnInit{
  usuarios: IUsuario[] = []

  sortedUsuarios: IUsuario[] = [...this.usuarios];
  sortColumn: keyof IUsuario = 'idusuario';
  sortAsc = true;
  isLoading = false
  roles: Array<{ idrol: number; descrol: string }> = [];
  usuarioSeleccionado: IUsuario | null = null;

constructor(private userService: UserService, private eventoService: ProyectoEventoService, private authService: MsalService){}

  ngOnInit(): void {
    this.cargarUsuarios();
    this.obtenerRoles();
    this.eventoService.usuarioCreado$.subscribe(() => {
      this.cargarUsuarios(); 
    });
  }

  private cargarUsuarios(){
    this.isLoading = true;
    this.userService.obtenerTodosLosUsuarios().subscribe( (res: IUsuario[]) => {
      this.usuarios = res;
      this.sortedUsuarios = [...this.usuarios];
      this.isLoading = false
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


  obtenerRoles() {
    this.userService.obtenerRoles().subscribe({
      next: (roles) => {
        this.roles = roles || {};
        console.log('Roles:', this.roles);
      },
      error: (error) => {
        console.error('Error al obtener los roles:', error);
      }
    });
  }


//FUNCOINES REFERENTES A LA EDICION DE USUARIO, SOLO SE EDITA EL ROL Y SI ESTÁ HABLITADO O NO






editarUsuario() {
  if (!this.usuarioSeleccionado) return;

  const usuarioEditado: IUsuario = {
    correo: this.usuarioSeleccionado.correo.trim().toLowerCase(),
    idrol: Number(this.usuarioSeleccionado.idrol),
    habilitado: this.usuarioSeleccionado.habilitado ? 1 : 0,
    nombreUsuario: null
  };

  Swal.fire({
    title: '¿Guardar cambios?',
    text: `¿Deseas actualizar los datos del usuario ${usuarioEditado.correo}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, guardar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (!result.isConfirmed) return;
    this.isLoading = true;
    this.authService.acquireTokenSilent({ scopes: environment.apiConfig.scopes }).subscribe({
      next: (response) => {
        const token = response.accessToken;

        if (!token) {
          this.isLoading = false;
          Swal.fire('Error', 'Token de autenticación no disponible.', 'error');
          return;
        }

        this.userService.editarUsuario(usuarioEditado, token).subscribe({
          next: () => {
            this.isLoading = false;
            Swal.fire('Actualizado', 'Los cambios se guardaron correctamente.', 'success');
            this.eventoService.notificarUsuarioCreado(); // Notificar a otros componentes
            this.cargarUsuarios(); // Recargar la lista de usuarios
          },
          error: (err) => {
            this.isLoading = false;
            Swal.fire('Error', 'No se pudo editar el usuario. Inténtalo nuevamente.', 'error');
            console.error('[ERROR] No se pudo editar el usuario:', err);
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire('Error', 'No se pudo obtener el token de autenticación.', 'error');
        console.error('[ERROR] Error al obtener el token:', err);
      }
    });
  });
}






  seleccionarUsuario(idusuario: IUsuario | any) {
    this.usuarioSeleccionado = this.usuarios.find(u => u.idusuario === idusuario) || null;
  
    if (!this.usuarioSeleccionado) {
      console.warn(`Usuario con ID ${idusuario} no encontrado.`);
    }
  }
  

}
