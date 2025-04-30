import { NgSelectModule } from '@ng-select/ng-select';
import { UserService } from 'src/services/user.service';
import { IUsuario } from 'src/models/user.model';
import { OnInit } from '@angular/core';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProyectoEventoService } from 'src/services/proyecto-evento.service';
import { SpinnerComponent } from '../spinner/spinner.component';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-crear-usuario',
  imports: [CommonModule, SpinnerComponent, FormsModule, NgSelectModule],
  templateUrl: './crear-usuario.component.html',
  styleUrl: './crear-usuario.component.css'
})


export class CrearUsuarioComponent implements OnInit{
  @Output() usuarioCreado = new EventEmitter<any>();

  filtroUsuario = '';
  mostrarModal = false;
  isLoading = false;
  submitted = false;
  
  usuarios: any[] = []; // Lista de usuarios obtenidos del servicio
  usuario: IUsuario = {
    nombreUsuario: '',
    correo: '',
    descrol: '',
    habilitado: 0,
    idrol: 1
  };
  selectedUserId = '';
  userDetails: any;

  constructor(private modalService: ProyectoEventoService, private userService: UserService){}




  async ngOnInit() {
    this.modalService.mostrarModalCrearUsuario$.subscribe(
      mostrar => {
        this.mostrarModal = mostrar;
      }
    );
  
    try {
      const result: any = await this.userService.getUsers();
      this.usuarios = result.value; // ← Aquí va la lista completa
      console.log('Usuarios del tenant:', this.usuarios); // ← Aquí el console.log que pediste
    } catch (error) {
      console.error('Error al obtener los usuarios del tenant:', error);
    }
  }

  async onSelectUser() {
    if (this.selectedUserId) {
      this.userDetails = await this.userService.getUserById(this.selectedUserId);
    }
  }

  cerrarModal() {
    // Llamamos al método del servicio para cerrar el modal
    this.modalService.cerrarCrearUsuario();
  }

  usuariosFiltrados() {
    if (!this.filtroUsuario) return this.usuarios;
    const filtro = this.filtroUsuario.toLowerCase();
    return this.usuarios.filter(user =>
      user.displayName?.toLowerCase().includes(filtro) ||
      user.mail?.toLowerCase().includes(filtro) ||
      user.userPrincipalName?.toLowerCase().includes(filtro)
    );
  }
  
  guardarUsuario() {
    this.submitted = true;
    
    this.usuarioCreado.emit();
    this.modalService.notificarUsuarioCreado(); // envio la notificación al servicio
    this.cerrarModal();
    
    // Mostrar loading
    this.isLoading = true;
    
    // Simulación de guardado (reemplazar con llamada real a servicio)
    setTimeout(() => {
      console.log('Guardando usuario:', this.usuario);
      
      // Emitir evento para el componente padre
      this.usuarioCreado.emit(this.usuario);
      
      // Ocultar loading
      this.isLoading = false;
      
      // Cerrar modal
      this.cerrarModal();
    }, 1000);
  }
}
