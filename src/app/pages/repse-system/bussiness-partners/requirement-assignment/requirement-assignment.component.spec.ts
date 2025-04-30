import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequirementAssignmentComponent } from './requirement-assignment.component';

describe('RequirementAssignmentComponent', () => {
  let component: RequirementAssignmentComponent;
  let fixture: ComponentFixture<RequirementAssignmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RequirementAssignmentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequirementAssignmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
