import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Afil01ModalComponent } from './afil01-modal.component';

describe('Afil01ModalComponent', () => {
  let component: Afil01ModalComponent;
  let fixture: ComponentFixture<Afil01ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ Afil01ModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Afil01ModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
