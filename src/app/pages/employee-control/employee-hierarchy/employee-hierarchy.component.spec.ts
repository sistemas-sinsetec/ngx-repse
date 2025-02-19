import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeHierarchyComponent } from './employee-hierarchy.component';

describe('EmployeeHierarchyComponent', () => {
  let component: EmployeeHierarchyComponent;
  let fixture: ComponentFixture<EmployeeHierarchyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmployeeHierarchyComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeHierarchyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
