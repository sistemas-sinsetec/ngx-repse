import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyTaxDetailsComponent } from './company-tax-details.component';

describe('CompanyTaxDetailsComponent', () => {
  let component: CompanyTaxDetailsComponent;
  let fixture: ComponentFixture<CompanyTaxDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompanyTaxDetailsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyTaxDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
