import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RejectionCommentComponent } from './rejection-comment.component';

describe('RejectionCommentComponent', () => {
  let component: RejectionCommentComponent;
  let fixture: ComponentFixture<RejectionCommentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RejectionCommentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RejectionCommentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
