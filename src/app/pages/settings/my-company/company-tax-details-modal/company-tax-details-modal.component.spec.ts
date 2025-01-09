import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyTaxDetailsModalComponent } from './company-tax-details-modal.component';

describe('CompanyTaxDetailsModalComponent', () => {
  let component: CompanyTaxDetailsModalComponent;
  let fixture: ComponentFixture<CompanyTaxDetailsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompanyTaxDetailsModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyTaxDetailsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
