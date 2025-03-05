import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepartmentRangesComponent } from './department-ranges.component';

describe('DepartmentRangesComponent', () => {
  let component: DepartmentRangesComponent;
  let fixture: ComponentFixture<DepartmentRangesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DepartmentRangesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepartmentRangesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
