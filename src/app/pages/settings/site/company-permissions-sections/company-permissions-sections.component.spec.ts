import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyPermissionsSectionsComponent } from './company-permissions-sections.component';

describe('CompanyPermissionsSectionsComponent', () => {
  let component: CompanyPermissionsSectionsComponent;
  let fixture: ComponentFixture<CompanyPermissionsSectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompanyPermissionsSectionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyPermissionsSectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
