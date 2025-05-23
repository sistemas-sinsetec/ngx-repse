/*
  En este servicio se administran los datos de inicio de sesion del usuario
*/
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Estado de sesión
  isLoggedIn = false;
  username: string = '';
  userId: string = '';
  avatar: string = '';

  employeeId: string = ''; // <-- NUEVO


  // Subject para emitir cambios en el avatar
  private avatarChange$ = new Subject<string>();

  constructor(private http: HttpClient) {
    // Verificar el estado de la sesión al cargar la aplicación
    this.isLoggedIn = this.checkAuthStatus();

    if (this.isLoggedIn) {
      this.username = localStorage.getItem('username') || '';
      this.employeeId = localStorage.getItem('employeeId') || ''; // <-- NUEVO
      this.userId = localStorage.getItem('userId') || '';
      this.avatar = localStorage.getItem('avatar') || 'assets/images/avatar.png'; // Cargar avatar desde localStorage
    }
  }

  /**
   * Manejo de Login
   * Guarda estado en localStorage y marca sesión como iniciada
   */
  login(username: string, userId: string, employeeId: string, avatar: string) {
    this.isLoggedIn = true;
    this.username = username;
    this.userId = userId;
    this.avatar = avatar;
    this.employeeId = employeeId; // <-- NUEVO

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('username', username);
    localStorage.setItem('userId', userId);
    localStorage.setItem('avatar', avatar); // Guardar avatar en localStorage
    localStorage.setItem('employeeId', employeeId); // <-- NUEVO

    // Emitir el cambio en el avatar
    this.avatarChange$.next(avatar);

    // Marcar que el usuario ya ha iniciado sesión y no es la primera vez
    this.setFirstTimeComplete();
  }

  /**
   * Cerrar sesión
   * Limpia datos en memoria y localStorage
   */
  logout() {
    this.isLoggedIn = false;
    this.username = '';
    this.userId = '';
    this.avatar = '';
    localStorage.clear();

    console.log('Sesión cerrada. Datos de usuario limpios.');
  }

  /**
   * Verificar si la sesión está activa
   */
  checkAuthStatus(): boolean {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    return isLoggedIn === 'true';
  }

  /**
   * Verifica si es la primera vez que el usuario inicia sesión
   */
  isFirstTime(): boolean {
    const isFirstTime = localStorage.getItem('isFirstTime');
    return isFirstTime !== 'false';
  }

  /**
   * Marca que el usuario ya ha iniciado sesión por primera vez
   */
  setFirstTimeComplete(): void {
    localStorage.setItem('isFirstTime', 'false');
  }

  /**
   * Carga el avatar del usuario desde el backend y lo guarda en el servicio
   */
  loadCurrentAvatar(userId: string): Promise<string> {
    return this.http
      .get(`${environment.apiBaseUrl}/getUserAvatar.php?userId=${userId}`)
      .toPromise()
      .then((response: any) => {
        if (response && response.avatarUrl) {
          // Guardar el avatar en el servicio y en localStorage
          this.avatar = response.avatarUrl;
          localStorage.setItem('avatar', response.avatarUrl);

          // Emitir el cambio en el avatar
          this.avatarChange$.next(response.avatarUrl);

          return response.avatarUrl; // Devuelve la URL del avatar
        } else {
          console.error('Estructura de respuesta inválida o falta avatarUrl:', response);
          return 'assets/images/avatar.png'; // Imagen predeterminada en caso de error
        }
      })
      .catch((error) => {
        console.error('Error al obtener el avatar:', error);
        return 'assets/images/avatar.png'; // Imagen predeterminada en caso de error
      });
  }

  /**
   * Actualiza el avatar del usuario en memoria y en localStorage
   */
  updateAvatar(newAvatarUrl: string): void {
    if (this.isLoggedIn) {
      // Actualizar el avatar en memoria
      this.avatar = newAvatarUrl;

      // Guardar el nuevo avatar en localStorage
      localStorage.setItem('avatar', newAvatarUrl);

      // Emitir el cambio en el avatar
      this.avatarChange$.next(newAvatarUrl);

      console.log('Avatar actualizado en el servicio y en localStorage:', newAvatarUrl);
    } else {
      console.warn('No se puede actualizar el avatar: el usuario no ha iniciado sesión.');
    }
  }

  /**
   * Observable para escuchar cambios en el avatar
   */
  onAvatarChange(): Subject<string> {
    return this.avatarChange$;
  }
}