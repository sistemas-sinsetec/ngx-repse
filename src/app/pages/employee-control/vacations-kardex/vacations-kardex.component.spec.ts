import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VacationsKardexComponent } from './vacations-kardex.component';

describe('VacationsKardexComponent', () => {
  let component: VacationsKardexComponent;
  let fixture: ComponentFixture<VacationsKardexComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VacationsKardexComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VacationsKardexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
