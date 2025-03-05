import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmWeekComponent } from './confirm-week.component';

describe('ConfirmWeekComponent', () => {
  let component: ConfirmWeekComponent;
  let fixture: ComponentFixture<ConfirmWeekComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmWeekComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmWeekComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
