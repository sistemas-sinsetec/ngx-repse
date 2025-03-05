import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepartmentRangesDialogComponent } from './department-ranges-dialog.component';

describe('DepartmentRangesDialogComponent', () => {
  let component: DepartmentRangesDialogComponent;
  let fixture: ComponentFixture<DepartmentRangesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DepartmentRangesDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepartmentRangesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
