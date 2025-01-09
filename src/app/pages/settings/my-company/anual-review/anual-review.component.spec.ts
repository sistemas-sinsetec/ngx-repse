import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnualReviewComponent } from './anual-review.component';

describe('AnualReviewComponent', () => {
  let component: AnualReviewComponent;
  let fixture: ComponentFixture<AnualReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnualReviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnualReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
