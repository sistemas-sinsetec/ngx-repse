import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import * as moment from "moment";
import { Observable, of } from "rxjs";
import { map } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class DocumentService {
  // Datos simulados
  private fileTypes = [
    {
      file_type_id: 12,
      name: "RFC",
      description: "Registro Federal de Contribuyentes",
      is_active: 1,
    },
    {
      file_type_id: 13,
      name: "Constancia de Situación Fiscal",
      description: "Constancia emitida por el SAT",
      is_active: 1,
    },
    {
      file_type_id: 14,
      name: "Comprobante de Domicilio",
      description: "Comprobante no mayor a 3 meses",
      is_active: 1,
    },
    {
      file_type_id: 15,
      name: "Identificación Oficial",
      description: "INE, Pasaporte o Cédula Profesional",
      is_active: 1,
    },
  ];

  private documentPeriods = [
    // RFC (semanal) - Documento completado
    {
      period_id: 1,
      required_file_id: 20,
      start_date: "2025-04-10",
      end_date: "2025-04-17",
      is_active: 0,
    },
    {
      period_id: 2,
      required_file_id: 20,
      start_date: "2025-04-17",
      end_date: "2025-04-24",
      is_active: 1,
    },
    // Constancia Fiscal (mensual) - Documento pendiente
    {
      period_id: 3,
      required_file_id: 21,
      start_date: "2025-04-01",
      end_date: "2025-04-30",
      is_active: 1,
    },
    // Constancia Fiscal periodo anterior (vencido)
    {
      period_id: 4,
      required_file_id: 21,
      start_date: "2025-03-01",
      end_date: "2025-03-31",
      is_active: 0,
    },
    // Otros documentos periódicos
    {
      period_id: 5,
      required_file_id: 22,
      start_date: "2025-01-01",
      end_date: "2025-03-31",
      deadline: "2025-04-15",
      is_active: 0,
    },
  ];

  private uploadedFiles = [
    // RFC - Documento completado (tiene archivo para el periodo actual)
    {
      file_id: 101,
      required_file_id: 20,
      period_id: 2,
      file_path: "RFC_20250418.pdf",
      issue_date: "2025-04-18",
      expiry_date: "2025-04-25",
      user_id: 1,
      status: "approved",
      comment: "RFC actualizado",
      is_current: 1,
      uploaded_at: "2025-04-18T10:30:00Z",
    },
    // RFC - Documento completado (periodo anterior)
    {
      file_id: 102,
      required_file_id: 20,
      period_id: 1,
      file_path: "RFC_20250412.pdf",
      issue_date: "2025-04-12",
      expiry_date: "2025-04-19",
      user_id: 1,
      status: "approved",
      comment: "RFC periodo anterior",
      is_current: 0,
      uploaded_at: "2025-04-12T14:45:00Z",
    },
    // Constancia Fiscal - Documento pendiente (no tiene archivo para periodo actual)
    {
      file_id: 103,
      required_file_id: 21,
      period_id: 4,
      file_path: "Constancia_20250315.pdf",
      issue_date: "2025-03-15",
      expiry_date: "2025-06-15",
      user_id: 1,
      status: "approved",
      comment: "Constancia Q1 2025",
      is_current: 0,
      uploaded_at: "2025-03-15T09:20:00Z",
    },
    // Comprobante de domicilio (no periódico) - Documento completado
    {
      file_id: 104,
      required_file_id: 23,
      period_id: null,
      file_path: "Comprobante_20250410.pdf",
      issue_date: "2025-04-10",
      expiry_date: "2025-07-10",
      user_id: 1,
      status: "approved",
      comment: "Recibo de luz abril",
      is_current: 1,
      uploaded_at: "2025-04-10T11:15:00Z",
    },
    // Identificación Oficial (vencida)
    {
      file_id: 105,
      required_file_id: 24,
      period_id: null,
      file_path: "INE_20240115.pdf",
      issue_date: "2025-01-15",
      expiry_date: "2025-04-15",
      user_id: 1,
      status: "approved",
      comment: "INE vencida",
      is_current: 1,
      uploaded_at: "2025-01-15T16:20:00Z",
    },
  ];

  getRequiredFiles(companyId: number) {
    const requiredFiles = [
      // RFC (semanal) - Completado
      {
        required_file_id: 20,
        company_id: 1,
        file_type_id: 12,
        is_periodic: 1,
        periodicity_type: "semanas",
        periodicity_count: 1,
        min_documents_needed: 1,
        start_date: "2025-04-10",
        end_date: null,
        is_active: 1,
        file_type: this.fileTypes.find((t) => t.file_type_id === 12),
        periods: this.documentPeriods.filter((p) => p.required_file_id === 20),
      },
      // Constancia Fiscal (mensual) - Pendiente
      {
        required_file_id: 21,
        company_id: 1,
        file_type_id: 13,
        is_periodic: 1,
        periodicity_type: "meses",
        periodicity_count: 1,
        min_documents_needed: 1,
        start_date: "2025-03-01",
        end_date: null,
        is_active: 1,
        file_type: this.fileTypes.find((t) => t.file_type_id === 13),
        periods: this.documentPeriods.filter((p) => p.required_file_id === 21),
      },
      // Comprobante de domicilio (no periódico) - Completado
      {
        required_file_id: 23,
        company_id: 1,
        file_type_id: 14,
        is_periodic: 0,
        periodicity_type: null,
        periodicity_count: null,
        min_documents_needed: 1,
        start_date: "2025-01-01",
        end_date: null,
        is_active: 1,
        file_type: this.fileTypes.find((t) => t.file_type_id === 14),
        periods: [],
      },
      // Identificación Oficial (no periódico) - Vencido
      {
        required_file_id: 24,
        company_id: 1,
        file_type_id: 15,
        is_periodic: 0,
        periodicity_type: null,
        periodicity_count: null,
        min_documents_needed: 1,
        start_date: "2025-01-01",
        end_date: null,
        is_active: 1,
        file_type: this.fileTypes.find((t) => t.file_type_id === 15),
        periods: [],
      },
    ];

    return of(
      requiredFiles.map((file) => {
        const current_period = file.periods.find((p) => p.is_active);
        const status = this.calculateStatus(file);

        return {
          ...file,
          name: file.file_type.name,
          description: file.file_type.description,
          current_period,
          deadline:
            current_period?.deadline || file.is_periodic
              ? null
              : this.calculateNonPeriodicDeadline(file),
          status,
          hasFiles: this.checkHasFiles(
            file.required_file_id,
            current_period?.period_id
          ),
        };
      })
    );
  }

  private calculateNonPeriodicDeadline(file: any): string | null {
    if (file.is_periodic) return null;

    const uploadedFile = this.uploadedFiles.find(
      (f) => f.required_file_id === file.required_file_id && f.is_current
    );

    return uploadedFile?.expiry_date || null;
  }

  private checkHasFiles(requiredFileId: number, periodId?: number): boolean {
    return this.uploadedFiles.some(
      (f) =>
        f.required_file_id === requiredFileId &&
        (periodId ? f.period_id === periodId : true) &&
        f.status === "approved"
    );
  }

  getUploadedFiles(requiredFileId: number, periodId?: number) {
    const filteredFiles = this.uploadedFiles.filter(
      (f) =>
        f.required_file_id === requiredFileId &&
        (periodId ? f.period_id === periodId : true)
    );
    return of(filteredFiles);
  }

  private calculateStatus(file: any): string {
    if (!file.is_periodic) {
      // Para documentos no periódicos
      const uploadedFile = this.uploadedFiles.find(
        (f) => f.required_file_id === file.required_file_id && f.is_current
      );

      if (!uploadedFile) return "pendiente";

      const now = moment();
      const expiryDate = moment(uploadedFile.expiry_date);

      return now.isAfter(expiryDate) ? "vencido" : "completado";
    }

    // Para documentos periódicos
    const now = moment();
    let currentPeriod = null;
    let lastPeriod = null;

    // Buscar periodo actual y último periodo
    for (const period of file.periods) {
      const start = moment(period.start_date);
      const end = moment(period.end_date);

      if (now.isBetween(start, end, null, "[]")) {
        currentPeriod = period;
      }

      // Actualizar último periodo (el más reciente)
      if (!lastPeriod || moment(period.end_date).isAfter(lastPeriod.end_date)) {
        lastPeriod = period;
      }
    }

    if (currentPeriod) {
      // Hay periodo actual
      const hasFiles = this.checkHasFiles(
        file.required_file_id,
        currentPeriod.period_id
      );
      return hasFiles ? "completado" : "pendiente";
    } else if (lastPeriod) {
      // No hay periodo actual, verificar si el último periodo ya venció
      return now.isAfter(moment(lastPeriod.end_date)) ? "vencido" : "pendiente";
    }

    // No hay periodos definidos
    return "pendiente";
  }

  // En tu DocumentService, actualiza getPastPeriods para incluir información de completitud:

  getPastPeriods(requiredFileId: number): Observable<any[]> {
    const periods = this.documentPeriods.filter(
      (p) => p.required_file_id === requiredFileId && p.is_active === 0
    );

    // Agregar información de completitud a cada periodo
    const periodsWithStatus = periods.map((period) => {
      const uploadedFiles = this.uploadedFiles.filter(
        (f) =>
          f.required_file_id === requiredFileId &&
          f.period_id === period.period_id
      );

      return {
        ...period,
        is_complete: uploadedFiles.length > 0,
      };
    });

    return of(periodsWithStatus);
  }

  // Simulación de subida/descarga
  downloadFile(filePath: string) {
    console.log(`Descargando archivo: ${filePath}`);
    // Simulación de descarga
    const link = document.createElement("a");
    link.href = `assets/documents/${filePath}`; // Ajusta esta ruta según tu estructura
    link.download = filePath;
    link.click();
  }

  uploadFile(
    file: File,
    requiredFileId: number,
    periodId?: number,
    format?: string
  ) {
    console.log(
      `Subiendo archivo para requiredFileId: ${requiredFileId}, periodId: ${periodId}, format: ${format}`
    );
    // Simulación de subida
    return of({
      success: true,
      file_id: Math.floor(Math.random() * 1000) + 100,
      file_path: `uploads/${file.name}`,
      format: format || "unknown",
    });
  }

  // Agrega este método a tu DocumentService
  getFileStructure(requiredFileId: number, periodId?: number): Observable<any> {
    // Datos de ejemplo basados en tu estructura actual
    const exampleStructures = {
      20: {
        // RFC (semanal)
        name: "RFC",
        periods: [
          {
            name: "Abr 2025 - Semana 2",
            isCurrent: true,
            formats: [
              {
                type: "PDF",
                files: [
                  {
                    name: "RFC_20250418.pdf",
                    path: "RFC_20250418.pdf",
                    uploaded_at: "2025-04-18T10:30:00Z",
                    isCurrent: true,
                  },
                ],
              },
            ],
          },
          {
            name: "Abr 2025 - Semana 1",
            isCurrent: false,
            formats: [
              {
                type: "PDF",
                files: [
                  {
                    name: "RFC_20250412.pdf",
                    path: "RFC_20250412.pdf",
                    uploaded_at: "2025-04-12T14:45:00Z",
                    isCurrent: false,
                  },
                ],
              },
              {
                type: "XML",
                files: [
                  {
                    name: "RFC_20250412.xml",
                    path: "RFC_20250412.xml",
                    uploaded_at: "2025-04-12T14:46:00Z",
                    isCurrent: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      21: {
        // Constancia de Situación Fiscal (mensual)
        name: "Constancia de Situación Fiscal",
        periods: [
          {
            name: "Mar 2025",
            isCurrent: false,
            formats: [
              {
                type: "PDF",
                files: [
                  {
                    name: "Constancia_20250315.pdf",
                    path: "Constancia_20250315.pdf",
                    uploaded_at: "2025-03-15T09:20:00Z",
                    isCurrent: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      23: {
        // Comprobante de Domicilio (no periódico)
        name: "Comprobante de Domicilio",
        periods: [
          {
            name: "Único",
            isCurrent: true,
            formats: [
              {
                type: "PDF",
                files: [
                  {
                    name: "Comprobante_20250410.pdf",
                    path: "Comprobante_20250410.pdf",
                    uploaded_at: "2025-04-10T11:15:00Z",
                    isCurrent: true,
                  },
                ],
              },
              {
                type: "JPG",
                files: [
                  {
                    name: "Comprobante_20250410.jpg",
                    path: "Comprobante_20250410.jpg",
                    uploaded_at: "2025-04-10T11:16:00Z",
                    isCurrent: true,
                  },
                ],
              },
            ],
          },
        ],
      },
      24: {
        // Identificación Oficial (no periódico)
        name: "Identificación Oficial",
        periods: [
          {
            name: "Único",
            isCurrent: true,
            formats: [
              {
                type: "PDF",
                files: [
                  {
                    name: "INE_20240115.pdf",
                    path: "INE_20240115.pdf",
                    uploaded_at: "2025-01-15T16:20:00Z",
                    isCurrent: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    // Devolver la estructura correspondiente al requiredFileId
    const structure = exampleStructures[requiredFileId] || {
      name: "Documento Desconocido",
      periods: [],
    };

    // Filtrar por periodo si se especifica
    if (periodId) {
      structure.periods = structure.periods.filter(
        (p) =>
          p.name.includes(`Semana ${periodId}`) ||
          p.name.includes(moment(periodId).format("MMM YYYY"))
      );
    }

    return of(structure);
  }

  // Método auxiliar para determinar el tipo de formato
  private getFormatType(extension: string): string {
    const formatMap = {
      pdf: "PDF",
      xml: "XML",
      txt: "TXT",
      jpg: "Imagen",
      jpeg: "Imagen",
      png: "Imagen",
    };

    return formatMap[extension] || extension.toUpperCase();
  }
}
