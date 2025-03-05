import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegCompanyComponent } from './reg-company.component';

describe('RegCompanyComponent', () => {
  let component: RegCompanyComponent;
  let fixture: ComponentFixture<RegCompanyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegCompanyComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegCompanyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
