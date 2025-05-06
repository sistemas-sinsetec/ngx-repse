import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentCatalogComponent } from './document-catalog.component';

describe('DocumentCatalogComponent', () => {
  let component: DocumentCatalogComponent;
  let fixture: ComponentFixture<DocumentCatalogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DocumentCatalogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentCatalogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
