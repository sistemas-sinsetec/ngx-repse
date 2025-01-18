import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionsBusineesPartnerComponent } from './permissions-businees-partner.component';

describe('PermissionsBusineesPartnerComponent', () => {
  let component: PermissionsBusineesPartnerComponent;
  let fixture: ComponentFixture<PermissionsBusineesPartnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PermissionsBusineesPartnerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermissionsBusineesPartnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
