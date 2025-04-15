/*
  En este codigo se especifica la carga de la constancia de situacion fiscal y se extraen algunos datos para
  posteriormente mostrarlos en esta misma vista
*/
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import * as moment from 'moment';
import * as pdfjsLib from 'pdfjs-dist';
import { LocalDataSource } from 'ng2-smart-table';
import { CompanyTaxDetailsModalComponent } from '../company-tax-details-modal/company-tax-details-modal.component';
import { NbDialogService } from '@nebular/theme';
import { environment } from '../../../../../environments/environment';

interface Period {
  period_number: number;
  start_date: string;
  end_date: string;
  payment_date: string;
  year: number;
  month: number;
  imss_bimonthly_start: boolean;
  imss_bimonthly_end: boolean;
  month_start: boolean;
  month_end: boolean;
  fiscal_year: string;
  fiscal_start: boolean;
  fiscal_end: boolean;
  payment_days: number;
}

@Component({
  selector: 'ngx-company-tax-details',
  templateUrl: './company-tax-details.component.html',
  styleUrls: ['./company-tax-details.component.scss']
})
export class CompanyTaxDetailsComponent implements OnInit {
  fechaInicioOperaciones: string;
  datosIdentificacion: any = {};
  domicilio: any = {};
  actividadesEconomicas: any[] = [];
  regimenes: any[] = [];
  obligaciones: any[] = [];
  isPersonaFisica: boolean = false;
  selectedOption: string = 'actual'; // 'actual' o 'historico'
  extractedData: any = null;
  pdfText: string = '';
  tipoPersona: string = 'moral'; // Valor por defecto
  companyData: any = null;
 

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private companyService: CompanyService,
    private dialogService: NbDialogService

  ) { }

  ngOnInit() {
    this.cargarRegistrosEmpresa();
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';
    moment.locale('es'); // Configura moment.js para español

  }

  cargarRegistrosEmpresa() {
    const companyId = this.companyService.selectedCompany.id;
    const endpoint = `${environment.apiBaseUrl}/get-data-company-s.php?company_id=${companyId}`;
  
    this.http.get<any>(endpoint).subscribe(
      (data) => {
        if (data && data.companyData) {
          this.companyData = data.companyData;
          this.actividadesEconomicas = data.actividadesEconomicas || [];
          this.regimenes = data.regimenes || [];
          this.obligaciones = data.obligaciones || [];
        } else {
          console.warn('No se encontraron datos de la empresa.');
          this.companyData = null;
          this.actividadesEconomicas = [];
          this.regimenes = [];
          this.obligaciones = [];
        }
      },
      (error) => {
        console.error('Error al obtener los datos de la empresa:', error);
        this.companyData = null;
        this.actividadesEconomicas = [];
        this.regimenes = [];
        this.obligaciones = [];
      }
    );
  }
  

  obtenerDatosPorSellos(digitalSeal: string, originalChainSeal: string) {
    // URL del endpoint para obtener los datos
    const endpoint = `${environment.apiBaseUrl}/get-data-by-seals.php?digital_seal=${encodeURIComponent(digitalSeal)}&original_chain_seal=${encodeURIComponent(originalChainSeal)}`;

    this.http.get<any>(endpoint).subscribe(
      (data) => {
        if (data) {
          // Actualizar las propiedades con los datos obtenidos
          this.fechaInicioOperaciones = data.fechaInicioOperaciones;
          this.datosIdentificacion = data.datosIdentificacion;
          this.domicilio = data.domicilio;
          this.actividadesEconomicas = data.actividadesEconomicas;
          this.regimenes = data.regimenes;
          this.obligaciones = data.obligaciones;

          console.log('Datos obtenidos correctamente:', data);
          console.log(this.datosIdentificacion) // Debería mostrar el contenido del nodo `datosIdentificacion`.
        } else {
          console.warn('No se encontraron datos para los valores proporcionados.');
        }
      },
      (error) => {
        console.error('Error al obtener los datos por sellos:', error);
      }
    );
  }
 
  onRegistroSeleccionado(selectedIndex: number) {
    
    if (this.companyData && this.companyData[selectedIndex]) {
      const selectedData = this.companyData[selectedIndex];
      const digitalSeal = selectedData?.DigitalSeal || '';
      const originalChainSeal = selectedData?.OriginalChainSeal || '';

      if (digitalSeal && originalChainSeal) {
        this.obtenerDatosPorSellos(digitalSeal, originalChainSeal);
      } else {
        console.warn('No se encontraron sellos digitales para el registro seleccionado.');
      }
    } else {
      console.warn('Índice seleccionado inválido.');
    }
  }

  async readPdf(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const pdfDocument = await pdfjsLib.getDocument({ data: uint8Array }).promise;

    this.pdfText = ''; // Limpiar texto previo

    // Leer texto de todas las páginas del PDF
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');

      this.pdfText += `Texto de la página ${pageNum}:\n${pageText}\n\n`;
    }

    // Procesar los datos extraídos
    this.extractDataFromText(this.pdfText);
  }

  extractDataFromText(text: string) {

    const cleanedText = text.replace(/\s+/g, ' ').trim();

    // Expresiones regulares para datos de identificación
    const idCifMatch =  text.match(/idCIF:\s+([0-9]+)/);
    const rfcMatch = text.match(/RFC:\s+([A-Z0-9]+)/);
    const curpMatch =  text.match(/CURP:\s+([A-Z0-9]+)/);
    const nombreMatch = text.match(/Nombre \(s\):\s+(.+?)(?=\s+Primer Apellido)/) ;
    const primerApellidoMatch = text.match(/Primer Apellido:\s+(.+?)\s/) ;
    const segundoApellidoMatch =  text.match(/Segundo Apellido:\s+(.+?)\s/) ;

    const razonSocialMatch =  text.match(/Denominación\/Razón Social:\s+(.+?)\s+Régimen/);
    const regimenCapitalMatch = text.match(/Régimen Capital:\s+(.+?)\s+Nombre Comercial/);
    const nombreComercialMatch = text.match(/Nombre Comercial:\s+(.+?)\s+Fecha inicio de operaciones/);
    const fechaInicioMatch = text.match(/Fecha inicio de operaciones:\s+(.+?)\s+Estatus/);
    const estatusMatch = text.match(/Estatus en el padrón:\s+(.+?)\s+Fecha de último cambio de estado/);
    const fechaCambioEstadoMatch = text.match(/Fecha de último cambio de estado:\s+([0-9A-Z\s]+(?=\s[D\s]|$))/);

    // Expresiones regulares para datos del domicilio
    const codigoPostalMatch = text.match(/Código Postal:\s+([0-9]+)/);
    const tipoVialidadMatch = text.match(/Tipo de Vialidad:\s+(.+?)\s+Nombre de Vialidad/);
    const nombreVialidadMatch = text.match(/Nombre de Vialidad:\s+(.+?)\s+Número Exterior/);
    const numeroExteriorMatch = text.match(/Número Exterior:\s+([0-9]+)/);
    const numeroInteriorMatch = text.match(/Número Interior:\s+(.+?)\s+Nombre de la Colonia/);
    const coloniaMatch = text.match(/Nombre de la Colonia:\s+(.+?)\s+Nombre de la Localidad/);
    const localidadMatch = text.match(/Nombre de la Localidad:\s+(.+?)\s+Nombre del Municipio/);
    const municipioMatch = text.match(/Nombre del Municipio o Demarcación Territorial:\s+(.+?)\s+Nombre de la Entidad/);
    const entidadFederativaMatch = text.match(/Nombre de la Entidad Federativa:\s+(.+?)\s+Entre Calle/);
    const entreCalleMatch = cleanedText.match(/Entre Calle:\s*([^\n\r]*?)(?=\sY Calle|\sTexto de la página|\sPágina|$)/);
    const yCalleMatch = cleanedText.match(/Y Calle:\s*([^\n\r]*?)(?=\sActividades Económicas|$)/);
    // Expresión regular para extraer las actividades económicas en un bloque
    const actividadesMatches = [...text.matchAll(/(\d+)\s+(.+?)\s+(\d{1,3})\s+(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}\/\d{2}\/\d{4}))?/g)];
    const actividades = actividadesMatches.map(match => ({
      Orden: match[1],
      Actividad: match[2].trim(),
      Porcentaje: match[3],
      FechaInicio: match[4] ? this.formatDateDMY(match[4]) : '-', // Formatear si existe
      FechaFin: match[5] ? this.formatDateDMY(match[5]) : '-'     // Formatear si existe
    }));

    // Expresión regular ajustada para extraer los regímenes
    const regimenMatches = [...text.matchAll(/(Régimen\s+[\w\s]+?)\s+(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}\/\d{2}\/\d{4}))?/g)];
    const regimenes = regimenMatches.map(match => ({
      Regimen: match[1].trim(),
      FechaInicio: match[2] ? this.formatDateDMY(match[2]) : '-',
      FechaFin: match[3] ? this.formatDateDMY(match[3]) : '-'
    }));

    // Extraer obligaciones
    const obligacionesSectionMatch = text.match(/Obligaciones:\s+([\s\S]+?)(?=Sus datos personales|$)/);
    const obligacionesSection = obligacionesSectionMatch ? obligacionesSectionMatch[1] : '';
    const cleanedObligacionesSection = obligacionesSection
      .replace(/Descripción de la Obligación\s+Descripción Vencimiento\s+Fecha Inicio\s+Fecha Fin/, '')
      .replace(/Página\s+\[\d+\]\s+de\s+\[\d+\]/g, '')
      .trim();
    const obligacionesMatches = [...cleanedObligacionesSection.matchAll(/(.+?)\s+(A\s+más\s+tardar.+?|Dentro\s+de\s+los.+?)\s+(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}\/\d{2}\/\d{4}))?/g)];
    const obligaciones = obligacionesMatches.map(match => ({
      Descripcion: match[1].trim(),
      Vencimiento: match[2].trim(),
      FechaInicio: match[3] ? this.formatDateDMY(match[3]) : '-',
      FechaFin: match[4] ? this.formatDateDMY(match[4]) : '-'
    }));


    const cadenaOriginalMatch = text.match(/Cadena Original Sello:\s+([\s\S]*?\|\|\s)/);
    const selloDigitalMatch = text.match(/Sello Digital:\s+([\s\S]+?)(?=\s{2,}|$)/);



    // Almacenar los resultados en el objeto `extractedData`
    this.extractedData = {
      DatosIdentificacion: {
        idCIF: idCifMatch ? idCifMatch[1] : 'No aplica',
        RFC: rfcMatch ? rfcMatch[1] : 'No encontrado',
        CURP: curpMatch ? curpMatch[1] : 'No aplica',
        Nombre: nombreMatch ? nombreMatch[1] : 'No aplica',
        PrimerApellido: primerApellidoMatch ? primerApellidoMatch[1] : 'No aplica',
        SegundoApellido: segundoApellidoMatch ? segundoApellidoMatch[1] : 'No aplica',
        RegimenCapital: regimenCapitalMatch ? regimenCapitalMatch[1] : 'No aplica',
        RazonSocial: razonSocialMatch ? razonSocialMatch[1] : 'No aplica',
        NombreComercial: nombreComercialMatch ? nombreComercialMatch[1] : 'No aplica',
        FechaInicio: fechaInicioMatch ? this.formatDate(fechaInicioMatch[1]) : 'No encontrado',
        Estatus: estatusMatch ? estatusMatch[1] : 'No encontrado',
        FechaCambioEstado: fechaCambioEstadoMatch ? this.formatDate(fechaCambioEstadoMatch[1].trim()) : 'No encontrado',
      },
      Domicilio: {
        CodigoPostal: codigoPostalMatch ? codigoPostalMatch[1] : 'No encontrado',
        TipoVialidad: tipoVialidadMatch ? tipoVialidadMatch[1] : 'No encontrado',
        NombreVialidad: nombreVialidadMatch ? nombreVialidadMatch[1] : 'No encontrado',
        NumeroExterior: numeroExteriorMatch ? numeroExteriorMatch[1] : 'No encontrado',
        NumeroInterior: numeroInteriorMatch ? numeroInteriorMatch[1] : 'No encontrado',
        Colonia: coloniaMatch ? coloniaMatch[1] : 'No encontrado',
        Localidad: localidadMatch ? localidadMatch[1] : 'No encontrado',
        Municipio: municipioMatch ? municipioMatch[1] : 'No encontrado',
        EntidadFederativa: entidadFederativaMatch ? entidadFederativaMatch[1] : 'No encontrado',
        EntreCalle: (entreCalleMatch && entreCalleMatch[1].trim() && !entreCalleMatch[1].includes('Texto de la página'))
          ? entreCalleMatch[1].trim()
          : 'No encontrado',
        YCalle: (yCalleMatch && yCalleMatch[1].trim() && !yCalleMatch[1].includes('Actividades Económicas'))
          ? yCalleMatch[1].trim()
          : 'No encontrado',
      },
      ActividadesEconomicas: actividades,
      Regimenes: regimenes,
      Obligaciones: obligaciones,
      SATSello: {
        CadenaOriginalSello: cadenaOriginalMatch ? cadenaOriginalMatch[1].trim() : 'No encontrado',
        SelloDigital: selloDigitalMatch ? selloDigitalMatch[1].trim() : 'No encontrado',
      }

    };

  }

  formatDate(dateString: string): string {
    return moment(dateString, 'DD [DE] MMMM [DE] YYYY', 'es').format('YYYY-MM-DD');
  }

  formatDateDMY(dateString: string): string {
    return moment(dateString, 'DD/MM/YYYY').format('YYYY-MM-DD');
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.readPdf(file).then(() => {
        alert('Datos extraídos correctamente. Ahora puedes guardarlos.');
      }).catch(error => {
        console.error('Error al procesar el PDF:', error);
        alert('Hubo un error al procesar el PDF. Por favor, inténtalo nuevamente.');
      });
    }
  }

  // Métodos para manejar la selección de filas en las tablas

  onRowSelectActividad(event: any) {
    const actividad = event.data;
    // Implementa la lógica que deseas al seleccionar una actividad económica
    console.log('Actividad seleccionada:', actividad);
  }

  onRowSelectRegimen(event: any) {
    const regimen = event.data;
    // Implementa la lógica que deseas al seleccionar un régimen
    console.log('Régimen seleccionado:', regimen);
  }

  onRowSelectObligacion(event: any) {
    const obligacion = event.data;
    // Implementa la lógica que deseas al seleccionar una obligación
    console.log('Obligación seleccionada:', obligacion);
  }

  mostrarDatosEnModal() {
    this.dialogService.open(CompanyTaxDetailsModalComponent, {
      context: {
        data: this.extractedData, // Pasamos los datos al modal
      },
      closeOnBackdropClick: false, // Opcional: evita cerrar el modal al hacer clic fuera
    }).onClose.subscribe(result => {
      // Procesar el resultado cuando el modal se cierra
      if (result && result.save) {
        this.actualizarDatosContribuyente(); // Guardar datos si el usuario presionó "Guardar"
      }
    });
  }


  actualizarDatosContribuyente() {
    const companyId = this.companyService.selectedCompany.id;

    if (!this.extractedData) {
      alert('Primero debes subir un documento PDF para extraer los datos.');
      return;
    }

    const payload = {
      company_id: companyId,
      ...this.extractedData, // Datos extraídos del PDF
    };

    const endpoint = `${environment.apiBaseUrl}/update-data-company.php`;

    this.http.post<any>(endpoint, payload).subscribe(
      (response) => {
        console.log('Datos actualizados correctamente:', response);
        alert('Los datos se actualizaron correctamente y los registros antiguos se guardaron en el historial.');
      },
      (error) => {
        console.error('Error al actualizar los datos:', error);
        alert('Hubo un error al actualizar los datos. Por favor, inténtalo nuevamente.');
      }
    );
  }


  
}
