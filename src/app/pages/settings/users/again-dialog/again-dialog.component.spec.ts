import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgainDialogComponent } from './again-dialog.component';

describe('AgainDialogComponent', () => {
  let component: AgainDialogComponent;
  let fixture: ComponentFixture<AgainDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AgainDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgainDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
