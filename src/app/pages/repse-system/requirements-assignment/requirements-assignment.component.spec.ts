import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequirementsAssignmentComponent } from './requirements-assignment.component';

describe('RequirementsAssignmentComponent', () => {
  let component: RequirementsAssignmentComponent;
  let fixture: ComponentFixture<RequirementsAssignmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RequirementsAssignmentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequirementsAssignmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
