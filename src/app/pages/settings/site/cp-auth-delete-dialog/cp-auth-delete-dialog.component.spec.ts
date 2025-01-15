import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CpAuthDeleteDialogComponent } from './cp-auth-delete-dialog.component';

describe('CpAuthDeleteDialogComponent', () => {
  let component: CpAuthDeleteDialogComponent;
  let fixture: ComponentFixture<CpAuthDeleteDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CpAuthDeleteDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CpAuthDeleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
