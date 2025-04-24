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
  guardarUsuario(usuario: IUsuario): Observable<IUsuario> {
    return this.http.post<IUsuario>(`${this.apiUrl}/usuarios`,usuario);
  }

  obtenerPerfil(usuarioId: string, CorreoElectronico: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  obtenerUsuarios(){
    return this.http.get<IUsuario[]>(`${this.apiUrl}/usuarios`);
  }

  enviarTokensAlBackend(accessToken: string, idToken: string): Observable<any> {
    return this.http.post(`${environment.apiUrl.api}/auth/tokens`, {
      accessToken,
      idToken
    });
  }
  
  // Método para obtener la foto de perfil que devuelve una Promise con la URL
obtenerFotoPerfil(userName: string, userId: string): Promise<string> {
  return new Promise((resolve) => {
    // Intenta obtener la foto desde Microsoft Graph
    this.http.get('https://graph.microsoft.com/v1.0/me/photo/$value', { 
      responseType: 'blob' 
    }).subscribe({
      next: (blob) => {
        // Convierte el blob a una URL de datos (data URL)
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data);
        };
      },
      error: (err) => {
        console.error('Error al obtener la foto de perfil:', err);
        // Usa el generador de avatar como fallback
        resolve(this.generateInitialsAvatar(userName, userId));
      }
    });
  });
}

// Método para generar avatar con iniciales
generateInitialsAvatar(name: string, userId: string): string {
  // Extraer iniciales (máximo 2 caracteres)
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  // Generar un color basado en el userId
  const colors = [
    '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e',
    '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50',
    '#f1c40f', '#e67e22', '#e74c3c', '#f39c12', '#d35400'
  ];
  
  let colorIndex = 0;
  for (let i = 0; i < userId.length; i++) {
    colorIndex += userId.charCodeAt(i);
  }
  colorIndex = colorIndex % colors.length;
  const bgColor = colors[colorIndex];
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <rect width="40" height="40" fill="${bgColor}" />
      <text x="20" y="25" font-family="Arial" font-size="16" fill="white" text-anchor="middle">${initials}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}
}
