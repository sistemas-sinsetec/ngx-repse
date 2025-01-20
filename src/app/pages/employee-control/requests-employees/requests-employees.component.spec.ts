import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestsEmployeesComponent } from './requests-employees.component';

describe('RequestsEmployeesComponent', () => {
  let component: RequestsEmployeesComponent;
  let fixture: ComponentFixture<RequestsEmployeesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RequestsEmployeesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestsEmployeesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
