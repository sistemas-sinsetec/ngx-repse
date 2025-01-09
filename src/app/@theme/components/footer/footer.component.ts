import { Component } from '@angular/core';

@Component({
  selector: 'ngx-footer',
  styleUrls: ['./footer.component.scss'],
  template: `
    <div class="logo">
        <!-- Espacio para el logo -->
        <img src="assets/images/logo.png" alt="SIINAD Logo" class="logo-img">
      </div>
      <div class="info">
        <span class="created-by">
          Acerca de <b>Sinergia de Integración Administrativa (SIINAD)</b>
        </span>
      </div>
    <div class="socials">
      <a href="#" target="_blank" class="ion ion-social-github"></a>
      <a href="#" target="_blank" class="ion ion-social-facebook"></a>
      <a href="#" target="_blank" class="ion ion-social-twitter"></a>
      <a href="#" target="_blank" class="ion ion-social-linkedin"></a>
    </div>
  `,
})
export class FooterComponent {
}
