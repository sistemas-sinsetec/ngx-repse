// shared/services/custom-toastr.service.ts
import { Injectable } from '@angular/core';
import { NbToastrService } from '@nebular/theme';

@Injectable({ providedIn: 'root' })
export class CustomToastrService {
  constructor(private toastr: NbToastrService) {}

  showSuccess(message: string, title: string = 'Éxito') {
    this.toastr.success(message, title);
  }

  showError(message: string, title: string = 'Error') {
    this.toastr.danger(message, title);
  }

  showWarning(message: string, title: string = 'Advertencia') {
    this.toastr.warning(message, title);
  }

  showInfo(message: string, title: string = 'Información') {
    this.toastr.info(message, title);
  }
}