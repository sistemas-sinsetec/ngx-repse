import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbAlertModule, NbToastrService } from '@nebular/theme';  // Cambié AlertController por NbToastrService
import { Share } from '@capacitor/share';
import { CompanyService } from '../../../../services/company.service';  // No se usó en este ejemplo, pero se mantiene
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'ngx-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.scss']
})
export class MyProfileComponent implements OnInit {
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
    private toastrService: NbToastrService, // 
    private companyService: CompanyService, // 
    private authService: AuthService,
  ) {
    // Inicialización
    this.idUser = this.companyService.selectedCompany.id();  // Si tienes un servicio para obtener el userId
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
          this.showAlert('Success', 'Avatar updated successfully.');
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

  async generateAndShareCode() {
    this.generatedCode = this.createUniqueCode(); // Genera un nuevo código
    this.saveGeneratedCode(); // Guarda el nuevo código generado en la tabla `user_codes`
    await this.shareCode();
  }

  async shareCode() {
    await Share.share({
      title: 'Código del Empleado',
      text: `Código del Empleado: ${this.generatedCode}`,
      dialogTitle: 'Compartir Código'
    });
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

  async saveSettings() {
    if (this.userPassword !== this.confirmPassword) {
      await this.showAlert('Error', 'Passwords do not match.');
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
    this.http.post(url, data).subscribe(async (response: any) => {
      await this.showAlert(response.success ? 'Success' : 'Error', response.message);
    });
  }

  async showAlert(header: string, message: string) {
    this.toastrService.show(message, header, {
      status: header === 'Error' ? 'danger' : 'success',
      destroyByClick: true,
      duration: 5000
    });
  }

  goBack() {
    // Lógica para regresar
  }

  ionViewWillLeave() {
    this.deleteEmployeeCode();
  }

  async deleteEmployeeCode() {
    const data = { employeeId: this.employeeId };

    this.http.post('https://siinad.mx/php/delete-employee-code.php', data).subscribe(
      async (response: any) => {
        if (response.success) {
          console.log('Código eliminado con éxito.');
        } else {
          console.error(response.error);
          await this.showAlert('Error', 'Error al eliminar el código.');
        }
      },
      async (error) => {
        console.error('Error en la solicitud POST:', error);
        await this.showAlert('Error', 'Error al eliminar el código.');
      }
    );
  }

  ngOnDestroy() {
    this.deleteEmployeeCode();
  }
}
