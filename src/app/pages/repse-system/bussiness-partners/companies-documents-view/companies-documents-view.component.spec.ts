import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompaniesDocumentsViewComponent } from './companies-documents-view.component';

describe('CompaniesDocumentsViewComponent', () => {
  let component: CompaniesDocumentsViewComponent;
  let fixture: ComponentFixture<CompaniesDocumentsViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompaniesDocumentsViewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompaniesDocumentsViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
