import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeCompanyComponent } from './code-company.component';

describe('CodeCompanyComponent', () => {
  let component: CodeCompanyComponent;
  let fixture: ComponentFixture<CodeCompanyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CodeCompanyComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodeCompanyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
