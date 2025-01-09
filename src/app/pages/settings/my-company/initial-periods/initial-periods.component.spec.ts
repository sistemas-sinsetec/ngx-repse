import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InitialPeriodsComponent } from './initial-periods.component';

describe('InitialPeriodsComponent', () => {
  let component: InitialPeriodsComponent;
  let fixture: ComponentFixture<InitialPeriodsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InitialPeriodsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InitialPeriodsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
