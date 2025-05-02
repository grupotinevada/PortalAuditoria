import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearUsuarioComponent } from './crear-usuario.component';

describe('CrearUsuarioComponent', () => {
  let component: CrearUsuarioComponent;
  let fixture: ComponentFixture<CrearUsuarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearUsuarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearUsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
// guardarUsuario(usuario: IUsuario): void {

//   this.isLoading = true;

//   this.userService.guardarUsuario(usuario).subscribe({
//     next: (response) => {
//       console.log('Usuario guardado exitosamente:', response);
//       this.usuarioCreado.emit(usuario);
//       this.modalService.notificarUsuarioCreado();
//       this.cerrarModal();
//     },
//     error: (err) => {
//       console.error('Error al guardar usuario:', err);
//     },
//     complete: () => {
//       this.isLoading = false;
//     }
//   });
  
// }