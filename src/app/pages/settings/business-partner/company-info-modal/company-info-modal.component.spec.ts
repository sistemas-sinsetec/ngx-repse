import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyInfoModalComponent } from './company-info-modal.component';

describe('CompanyInfoModalComponent', () => {
  let component: CompanyInfoModalComponent;
  let fixture: ComponentFixture<CompanyInfoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompanyInfoModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyInfoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
