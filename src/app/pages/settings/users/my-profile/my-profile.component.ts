import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbToastrService } from '@nebular/theme';  // Asegúrate de que NbToastrModule está importado en tu módulo
import { CompanyService } from '../../../../services/company.service';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'ngx-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.scss']
})
export class MyProfileComponent implements OnInit, OnDestroy {
  idUser: string;
  fullName: string;
  userName: string;
  userEmail: string;
  userPassword: string;
  confirmPassword: string;
  avatar: string;
  editMode: string = 'edit'; // Inicializa el modo de edición a 'edit'
  generatedCode: string = ''; // Inicializa el código generado
  employeeName: string;
  employeeId: string;

  constructor(
    private http: HttpClient,
    private toastrService: NbToastrService,
    private companyService: CompanyService,
    private authService: AuthService,
    private router: Router,
  ) {
    // Inicialización
    this.idUser = this.authService.userId; // Si tienes un servicio para obtener el userId
    this.employeeName = this.authService.username;
    this.employeeId = this.authService.userId;
  }

  ngOnInit() {
    this.getUserData();
    this.getUserAvatar();
    this.generatedCode = this.createUniqueCode(); // Genera el código único al iniciar
    this.saveGeneratedCode(); // Guarda el código generado en la tabla `user_codes`
  }

  getUserData() {
    const url = `https://www.siinad.mx/php/get_user.php?idUser=${this.idUser}`;
    this.http.get(url).subscribe((response: any) => {
      if (response.success) {
        this.fullName = response.data.name;
        this.userName = response.data.username;
        this.userEmail = response.data.email;
      } else {
        this.showAlert('Error', response.message);
      }
    });
  }

  getUserAvatar() {
    const url = `https://www.siinad.mx/php/getUserAvatar.php?userId=${this.idUser}`;
    this.http.get(url).subscribe((response: any) => {
      if (response.avatarUrl) {
        this.avatar = response.avatarUrl;
      } else {
        this.showAlert('Error', response.error);
      }
    });
  }

  // Simular clic en un input de archivo oculto
triggerFileInput(inputId: string) {
  const fileInput = document.getElementById(inputId) as HTMLElement;
  if (fileInput) {
    fileInput.click();
  } else {
    console.error('No se pudo encontrar el input de archivo con ID:', inputId);
  }
}

  changeProfilePicture(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('userId', this.idUser);

      const url = `https://www.siinad.mx/php/upload_avatar.php`;
      this.http.post(url, formData).subscribe((response: any) => {
        if (response.success) {
          this.avatar = response.filePath;
          this.showAlert('Éxito', 'Avatar actualizado exitosamente.');
        } else {
          this.showAlert('Error', response.error);
        }
      });
    }
  }

  createUniqueCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  generateAndShareCode() {
    this.generatedCode = this.createUniqueCode(); // Genera un nuevo código
    this.saveGeneratedCode(); // Guarda el nuevo código generado en la tabla `user_codes`
  }

  saveGeneratedCode() {
    const data = {
      user_id: this.idUser,
      code: this.generatedCode
    };

    const url = `https://www.siinad.mx/php/save_user_code.php`;
    this.http.post(url, data).subscribe(
      (response: any) => {
        if (response.success) {
          console.log('Código guardado exitosamente en la tabla user_codes.');
        } else {
          console.error('Error al guardar el código:', response.error);
        }
      },
      (error) => {
        console.error('Error en la solicitud POST:', error);
      }
    );
  }

  saveSettings() {
    if (this.userPassword !== this.confirmPassword) {
      this.showAlert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    const data = {
      idUser: this.idUser,
      fullName: this.fullName,
      userName: this.userName,
      userEmail: this.userEmail,
      userPassword: this.userPassword // Enviar solo si la contraseña ha sido cambiada
    };

    const url = `https://www.siinad.mx/php/update_user.php`;
    this.http.post(url, data).subscribe((response: any) => {
      this.showAlert(response.success ? 'Éxito' : 'Error', response.message);
    });
  }

  shareCode() {
    if (this.generatedCode) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(this.generatedCode).then(() => {
          this.showAlert('Éxito', 'Código copiado al portapapeles.');
        }).catch((err) => {
          console.error('Error al copiar el código: ', err);
          this.showAlert('Error', 'No se pudo copiar el código.');
        });
      } else {
        // Fallback para navegadores que no soportan navigator.clipboard
        this.fallbackCopyTextToClipboard(this.generatedCode);
      }
    } else {
      this.showAlert('Advertencia', 'No hay código para copiar.');
    }
  }

  // Método de fallback usando un textarea temporal
  fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Evitar que el textarea sea visible
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.showAlert('Éxito', 'Código copiado al portapapeles.');
      } else {
        this.showAlert('Error', 'No se pudo copiar el código.');
      }
    } catch (err) {
      console.error('Error al copiar el código: ', err);
      this.showAlert('Error', 'No se pudo copiar el código.');
    }

    document.body.removeChild(textArea);
  }

  showAlert(header: string, message: string) {
    let status: 'success' | 'danger' | 'warning' = 'success';

    if (header === 'Error') {
      status = 'danger';
    } else if (header === 'Advertencia') {
      status = 'warning';
    }

    this.toastrService.show(message, header, {
      status: status,
      destroyByClick: true,
      duration: 5000
    });
  }

  ionViewWillLeave() {
    this.deleteEmployeeCode();
  }

  deleteEmployeeCode() {
    const data = { employeeId: this.employeeId };

    this.http.post('https://siinad.mx/php/delete-employee-code.php', data).subscribe(
      (response: any) => {
        if (response.success) {
          console.log('Código eliminado con éxito.');
        } else {
          console.error(response.error);
          this.showAlert('Error', 'Error al eliminar el código.');
        }
      },
      (error) => {
        console.error('Error en la solicitud POST:', error);
        this.showAlert('Error', 'Error al eliminar el código.');
      }
    );
  }

  ngOnDestroy() {
    this.deleteEmployeeCode();
  }
}
