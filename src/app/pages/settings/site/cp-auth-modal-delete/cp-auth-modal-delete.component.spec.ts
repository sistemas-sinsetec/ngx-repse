import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CpAuthModalDeleteComponent } from './cp-auth-modal-delete.component';

describe('CpAuthModalDeleteComponent', () => {
  let component: CpAuthModalDeleteComponent;
  let fixture: ComponentFixture<CpAuthModalDeleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CpAuthModalDeleteComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CpAuthModalDeleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
