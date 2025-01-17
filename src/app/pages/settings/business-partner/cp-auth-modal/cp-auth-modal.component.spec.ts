import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CpAuthModalComponent } from './cp-auth-modal.component';

describe('CpAuthModalComponent', () => {
  let component: CpAuthModalComponent;
  let fixture: ComponentFixture<CpAuthModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CpAuthModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CpAuthModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
