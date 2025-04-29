import { OnInit } from '@angular/core';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProyectoEventoService } from 'src/services/proyecto-evento.service';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'app-crear-usuario',
  imports: [CommonModule, SpinnerComponent],
  templateUrl: './crear-usuario.component.html',
  styleUrl: './crear-usuario.component.css'
})


export class CrearUsuarioComponent implements OnInit{
  @Output() usuarioCreado = new EventEmitter<any>();

  mostrarModal = false;
  isLoading = false;
  submitted = false;
  
  usuario = {
    nombre: '',
    correo: '',
    rol: '',
    password: ''
  };
  
  constructor(private modalService: ProyectoEventoService){}




ngOnInit() {
    // Suscribirse al observable del servicio para mostrar/ocultar el modal
    this.modalService.mostrarModalCrearUsuario$.subscribe(
      mostrar => {
        this.mostrarModal = mostrar;
    
      }
    );
  }
  cerrarModal() {
    // Llamamos al método del servicio para cerrar el modal
    this.modalService.cerrarCrearUsuario();
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
