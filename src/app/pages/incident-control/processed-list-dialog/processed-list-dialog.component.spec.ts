import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessedListDialogComponent } from './processed-list-dialog.component';

describe('ProcessedListDialogComponent', () => {
  let component: ProcessedListDialogComponent;
  let fixture: ComponentFixture<ProcessedListDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProcessedListDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessedListDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
