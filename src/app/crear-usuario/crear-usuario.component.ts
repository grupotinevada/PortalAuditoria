/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/array-type */
import { NgSelectModule } from '@ng-select/ng-select';
import { UserService } from 'src/services/user.service';
import { IUsuario } from 'src/models/user.model';
import { AfterViewInit, OnInit } from '@angular/core';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProyectoEventoService } from 'src/services/proyecto-evento.service';
import { SpinnerComponent } from '../spinner/spinner.component';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { MsalService } from '@azure/msal-angular';
import { environment } from 'src/environments/environment';
declare var bootstrap: any;

@Component({
  selector: 'app-crear-usuario',
  imports: [CommonModule, SpinnerComponent, FormsModule, NgSelectModule],
  templateUrl: './crear-usuario.component.html',
  styleUrl: './crear-usuario.component.css'
})


export class CrearUsuarioComponent implements OnInit, AfterViewInit {
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
  roles: Array<{ idrol: number; descrol: string }> = [];
  
  constructor(private authService: MsalService, private modalService: ProyectoEventoService, private userService: UserService){}



  async ngOnInit() {
    this.modalService.mostrarModalCrearUsuario$.subscribe(
      mostrar => {
        this.mostrarModal = mostrar;
        if (mostrar) {
          this.cargarUsuarios();
        }
      }
    );
  }

  ngAfterViewInit() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  async cargarUsuarios() {
    try {
      this.isLoading = true;
      const result: any = await this.userService.getUsers();
      this.usuarios = result.value;
      this.obtenerRoles();
      console.log('Usuarios del tenant:', this.usuarios);
    } catch (error) {
      console.error('Error al obtener los usuarios del tenant:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async onSelectUser() {
    if (this.selectedUserId) {
      try {
        this.isLoading = true;
        this.userDetails = await this.userService.getUserById(this.selectedUserId);
        
        // Inicializar el formulario con los datos del usuario seleccionado
        this.inicializarFormulario();
      } catch (error) {
        console.error('Error al obtener detalles del usuario:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  inicializarFormulario() {
    if (this.userDetails) {
      // Actualizar el objeto usuario con los detalles seleccionados
      this.usuario = {
        idusuario: this.userDetails.id || '',
        nombreUsuario: this.userDetails.displayName || '',
        correo: this.userDetails.mail || this.userDetails.userPrincipalName || '',
        idrol: this.usuario.idrol, // Valor por defecto, puede ser ajustado según la lógica de negocio
        habilitado: this.usuario.habilitado // Por defecto habilitado
      };
    }
  }

  cerrarModal() {
    // Resetear valores
    this.filtroUsuario = '';
    this.selectedUserId = '';
    this.userDetails = null;
    this.submitted = false;
    
    // Resetear el objeto usuario
    this.usuario = {
      idusuario: '',
      nombreUsuario: '',
      correo: '',
      descrol: '',
      habilitado: 0,
      idrol: 1
    };
    
    // Llamamos al método del servicio para cerrar el modal
    this.modalService.cerrarCrearUsuario();
  }

  usuariosFiltrados() {
    if (!this.filtroUsuario) return this.usuarios;
    const filtro = this.filtroUsuario.toLowerCase();
    return this.usuarios.filter(user =>
      (user.displayName?.toLowerCase() || '').includes(filtro) ||
      (user.mail?.toLowerCase() || '').includes(filtro) ||
      (user.userPrincipalName?.toLowerCase() || '').includes(filtro)
    );
  }
  
  
  async guardarUsuario() {
    this.submitted = true;
  
    if (!this.selectedUserId || !this.userDetails) {
      Swal.fire({
        icon: 'warning',
        title: 'Usuario no válido',
        text: 'Debe seleccionar un usuario válido antes de guardar.',
      });
      return;
    }
  
    this.isLoading = true;
  
    this.authService.acquireTokenSilent({ scopes: environment.apiConfig.scopes }).subscribe({
      next: (result) => {
        const accessToken = result.accessToken;
        console.log('idusuario:', this.selectedUserId, 'nombre usuario', this.userDetails.nombre);
       
  
        console.log('Guardando usuario:', this.usuario);
  
        this.userService.guardarUsuario(this.usuario, accessToken).subscribe({
          next: (res) => {
            console.log('Usuario guardado exitosamente', res);
            Swal.fire('Éxito', 'Usuario creado satisfactoriamente', 'success').then(() => {
              this.cerrarModal();
              this.usuarioCreado.emit(this.usuario);
              this.modalService.notificarUsuarioCreado();
            });
          },
          error: (error) => {
            console.error('Error al guardar el usuario:', error);
            Swal.fire('Error', 'No se pudo guardar el usuario. Intente nuevamente.', 'error');
            this.isLoading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error al obtener el token:', err);
        Swal.fire('Error', 'No se pudo obtener el token de acceso.', 'error');
        this.isLoading = false;
      }
    });
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
}