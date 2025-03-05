import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignProjectsComponent } from './assign-projects.component';

describe('AssignProjectsComponent', () => {
  let component: AssignProjectsComponent;
  let fixture: ComponentFixture<AssignProjectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignProjectsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
