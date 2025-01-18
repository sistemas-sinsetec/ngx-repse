import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CpAuthComponent } from './cp-auth.component';

describe('CpAuthComponent', () => {
  let component: CpAuthComponent;
  let fixture: ComponentFixture<CpAuthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CpAuthComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CpAuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
