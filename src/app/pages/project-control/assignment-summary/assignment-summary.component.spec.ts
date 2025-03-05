import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentSummaryComponent } from './assignment-summary.component';

describe('AssignmentSummaryComponent', () => {
  let component: AssignmentSummaryComponent;
  let fixture: ComponentFixture<AssignmentSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignmentSummaryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignmentSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
