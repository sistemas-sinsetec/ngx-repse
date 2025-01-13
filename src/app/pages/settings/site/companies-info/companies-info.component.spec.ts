import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompaniesInfoComponent } from './companies-info.component';

describe('CompaniesInfoComponent', () => {
  let component: CompaniesInfoComponent;
  let fixture: ComponentFixture<CompaniesInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompaniesInfoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompaniesInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
