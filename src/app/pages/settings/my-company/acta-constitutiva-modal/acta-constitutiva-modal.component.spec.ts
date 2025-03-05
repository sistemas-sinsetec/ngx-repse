import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActaConstitutivaModalComponent } from './acta-constitutiva-modal.component';

describe('ActaConstitutivaModalComponent', () => {
  let component: ActaConstitutivaModalComponent;
  let fixture: ComponentFixture<ActaConstitutivaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActaConstitutivaModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActaConstitutivaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
