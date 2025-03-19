import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MensualReviewComponent } from './mensual-review.component';

describe('MensualReviewComponent', () => {
  let component: MensualReviewComponent;
  let fixture: ComponentFixture<MensualReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MensualReviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MensualReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
