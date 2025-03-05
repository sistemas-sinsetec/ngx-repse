import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstablecimientosModalComponent } from './establecimientos-modal.component';

describe('EstablecimientosModalComponent', () => {
  let component: EstablecimientosModalComponent;
  let fixture: ComponentFixture<EstablecimientosModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EstablecimientosModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstablecimientosModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
