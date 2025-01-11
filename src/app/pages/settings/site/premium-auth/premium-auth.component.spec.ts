import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PremiumAuthComponent } from './premium-auth.component';

describe('PremiumAuthComponent', () => {
  let component: PremiumAuthComponent;
  let fixture: ComponentFixture<PremiumAuthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PremiumAuthComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PremiumAuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
