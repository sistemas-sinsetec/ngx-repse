import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessedAttendanceComponent } from './processed-attendance.component';

describe('ProcessedAttendanceComponent', () => {
  let component: ProcessedAttendanceComponent;
  let fixture: ComponentFixture<ProcessedAttendanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProcessedAttendanceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessedAttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
