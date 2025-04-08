import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MensualUploadComponent } from './mensual-upload.component';

describe('MensualUploadComponent', () => {
  let component: MensualUploadComponent;
  let fixture: ComponentFixture<MensualUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MensualUploadComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MensualUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
