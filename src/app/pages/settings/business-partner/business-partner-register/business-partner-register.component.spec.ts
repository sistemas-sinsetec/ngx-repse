import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusinessPartnerRegisterComponent } from './business-partner-register.component';

describe('BusinessPartnerRegisterComponent', () => {
  let component: BusinessPartnerRegisterComponent;
  let fixture: ComponentFixture<BusinessPartnerRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BusinessPartnerRegisterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusinessPartnerRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
