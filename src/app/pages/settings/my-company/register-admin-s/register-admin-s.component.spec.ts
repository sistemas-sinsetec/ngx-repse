import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterAdminSComponent } from './register-admin-s.component';

describe('RegisterAdminSComponent', () => {
  let component: RegisterAdminSComponent;
  let fixture: ComponentFixture<RegisterAdminSComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegisterAdminSComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterAdminSComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
