import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  TemplateRef,
} from "@angular/core";
import { NbDialogService } from "@nebular/theme";
import * as moment from "moment";

@Component({
  selector: "ngx-requirement-table",
  templateUrl: "./requirement-table.component.html",
  styleUrls: ["./requirement-table.component.scss"],
})
export class RequirementTableComponent {
  @Input() requirements: any[] = [];
  @Input() isForCompany: boolean = false;
  @Output() deletePeriodicity = new EventEmitter<any>();

  @ViewChild("deleteConfirmation")
  deleteConfirmationTemplate!: TemplateRef<any>;
  requirementToDelete: any = null;

  constructor(private dialogService: NbDialogService) {}

  isExtremeFutureDate(momentDate: moment.Moment): boolean {
    return (
      momentDate.isValid() && momentDate.format("DD/MM/YYYY") === "31/12/9999"
    );
  }

  getFormattedDate(date: string | Date | null | undefined): string {
    if (!date) return "-";
    const parsed = moment.utc(date);
    if (!parsed.isValid()) return "-";

    return this.isExtremeFutureDate(parsed)
      ? "N/A"
      : parsed.format("DD/MM/YYYY");
  }

  openDeleteConfirmation(requirement: any): void {
    this.requirementToDelete = requirement;
    this.dialogService
      .open(this.deleteConfirmationTemplate, {
        context: { requirement },
      })
      .onClose.subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.deletePeriodicity.emit(requirement);
        }
        this.requirementToDelete = null;
      });
  }
}
