import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectCompanyPeriodDialogComponent } from './select-company-period-dialog.component';

describe('SelectCompanyPeriodDialogComponent', () => {
  let component: SelectCompanyPeriodDialogComponent;
  let fixture: ComponentFixture<SelectCompanyPeriodDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectCompanyPeriodDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectCompanyPeriodDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
