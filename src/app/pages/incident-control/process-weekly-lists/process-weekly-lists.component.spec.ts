import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessWeeklyListsComponent } from './process-weekly-lists.component';

describe('ProcessWeeklyListsComponent', () => {
  let component: ProcessWeeklyListsComponent;
  let fixture: ComponentFixture<ProcessWeeklyListsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProcessWeeklyListsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessWeeklyListsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
