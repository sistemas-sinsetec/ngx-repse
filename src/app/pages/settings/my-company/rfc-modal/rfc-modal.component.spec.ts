import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RfcModalComponent } from './rfc-modal.component';

describe('RfcModalComponent', () => {
  let component: RfcModalComponent;
  let fixture: ComponentFixture<RfcModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RfcModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RfcModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
