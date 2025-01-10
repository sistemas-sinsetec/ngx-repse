import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionsSectionsComponent } from './permissions-sections.component';

describe('PermissionsSectionsComponent', () => {
  let component: PermissionsSectionsComponent;
  let fixture: ComponentFixture<PermissionsSectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PermissionsSectionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermissionsSectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
