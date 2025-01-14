import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeHoursModalComponent } from './change-hours-modal.component';

describe('ChangeHoursModalComponent', () => {
  let component: ChangeHoursModalComponent;
  let fixture: ComponentFixture<ChangeHoursModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChangeHoursModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangeHoursModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
