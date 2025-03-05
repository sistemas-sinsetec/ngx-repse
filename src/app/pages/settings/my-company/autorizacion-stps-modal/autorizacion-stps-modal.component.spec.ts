import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AutorizacionStpsModalComponent } from './autorizacion-stps-modal.component';

describe('AutorizacionStpsModalComponent', () => {
  let component: AutorizacionStpsModalComponent;
  let fixture: ComponentFixture<AutorizacionStpsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AutorizacionStpsModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AutorizacionStpsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
