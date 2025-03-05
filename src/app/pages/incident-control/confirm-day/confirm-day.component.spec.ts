import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDayComponent } from './confirm-day.component';

describe('ConfirmDayComponent', () => {
  let component: ConfirmDayComponent;
  let fixture: ComponentFixture<ConfirmDayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmDayComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmDayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
