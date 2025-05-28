import { ComponentFixture, TestBed } from "@angular/core/testing";

import { DocumentTreeComponent } from "./document-tree.component";

describe("DocumentTreeComponent", () => {
  let component: DocumentTreeComponent;
  let fixture: ComponentFixture<DocumentTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocumentTreeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  // ✅ Nueva prueba para verificar el campo `expired`
  it("should correctly set expired based on is_expired value", () => {
    const mockData = [
      {
        name: "Tipo Documento",
        periodicities: [
          {
            type: "mensual",
            count: 1,
            periods: [
              {
                start_date: "2024-01-01",
                end_date: "2024-01-31",
                formats: [
                  {
                    code: "fmt1",
                    files: [
                      { file_path: "/path/doc1.pdf", is_expired: 1 },
                      { file_path: "/path/doc2.pdf", is_expired: 0 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const tree = component.transformToTree(mockData);

    const fileNodes = tree[0].children![0].children![0].children![0].children!;

    const file1 = fileNodes[0].data;
    const file2 = fileNodes[1].data;

    expect(file1.name).toBe("doc1.pdf");
    expect(file1.isExpired).toBe(true);

    expect(file2.name).toBe("doc2.pdf");
    expect(file2.isExpired).toBe(false);
  });
});
