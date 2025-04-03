import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IUsuario } from '../models/user.model';
import { IPais } from 'src/models/pais.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl.api;

  constructor(private http: HttpClient) {}

  // Guardar usuario en la base de datos
  guardarUsuario(usuario: IUsuario): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/usuarios`,usuario);
  }

  obtenerPerfil(usuarioId: string, CorreoElectronico: string) {
    return this.http.get<any>(`${this.apiUrl}/usuario/${usuarioId}/${CorreoElectronico}/perfil`);
  }
  
  obtenerPaises(){
    return this.http.get<IPais[]>(`${this.apiUrl}/pais`);
  }

  // Obtener usuario actual desde sessionStorage
  getCurrentUser(): IUsuario | null {
    const userData = sessionStorage.getItem('userData');
    return userData ? JSON.parse(userData) as IUsuario : null;
  }
}
