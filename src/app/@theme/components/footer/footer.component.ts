import { Component } from "@angular/core";

@Component({
  selector: "ngx-footer",
  styleUrls: ["./footer.component.scss"],
  template: `
    <div class="logo">
      <!-- Espacio para el logo -->
      <img src="assets/images/logo.png" alt="SIINAD Logo" class="logo-img" />
    </div>
    <div class="info">
      <span class="created-by">
        Acerca de <b>Sinergia de Integración Administrativa (SIINAD)</b>
      </span>
    </div>
    <div class="socials">
      <a
        href="https://www.facebook.com/S11nad/"
        target="_blank"
        class="ion ion-social-facebook"
      ></a>
    </div>
  `,
})
export class FooterComponent {}
