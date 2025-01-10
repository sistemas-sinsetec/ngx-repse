import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContratoModalComponent } from './contrato-modal.component';

describe('ContratoModalComponent', () => {
  let component: ContratoModalComponent;
  let fixture: ComponentFixture<ContratoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ContratoModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContratoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
