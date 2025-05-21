import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequirementAssignmentFormComponent } from './requirement-assignment-form.component';

describe('RequirementAssignmentFormComponent', () => {
  let component: RequirementAssignmentFormComponent;
  let fixture: ComponentFixture<RequirementAssignmentFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RequirementAssignmentFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequirementAssignmentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
