import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentViewerComponent } from './incident-viewer.component';

describe('IncidentViewerComponent', () => {
  let component: IncidentViewerComponent;
  let fixture: ComponentFixture<IncidentViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IncidentViewerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
