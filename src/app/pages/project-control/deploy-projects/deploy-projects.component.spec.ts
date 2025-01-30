import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeployProjectsComponent } from './deploy-projects.component';

describe('DeployProjectsComponent', () => {
  let component: DeployProjectsComponent;
  let fixture: ComponentFixture<DeployProjectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeployProjectsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeployProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
