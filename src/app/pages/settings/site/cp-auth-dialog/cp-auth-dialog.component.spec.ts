import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CpAuthDialogComponent } from './cp-auth-dialog.component';

describe('CpAuthDialogComponent', () => {
  let component: CpAuthDialogComponent;
  let fixture: ComponentFixture<CpAuthDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CpAuthDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CpAuthDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
