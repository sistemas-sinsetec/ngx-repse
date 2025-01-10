import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewInfoModalComponent } from './review-info-modal.component';

describe('ReviewInfoModalComponent', () => {
  let component: ReviewInfoModalComponent;
  let fixture: ComponentFixture<ReviewInfoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReviewInfoModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewInfoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
