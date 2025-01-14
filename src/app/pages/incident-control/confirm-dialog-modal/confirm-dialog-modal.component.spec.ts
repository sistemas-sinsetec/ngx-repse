import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDialogModalComponent } from './confirm-dialog-modal.component';

describe('ConfirmDialogModalComponent', () => {
  let component: ConfirmDialogModalComponent;
  let fixture: ComponentFixture<ConfirmDialogModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmDialogModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
