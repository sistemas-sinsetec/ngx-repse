import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnualUploadComponent } from './anual-upload.component';

describe('AnualUploadComponent', () => {
  let component: AnualUploadComponent;
  let fixture: ComponentFixture<AnualUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnualUploadComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnualUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
