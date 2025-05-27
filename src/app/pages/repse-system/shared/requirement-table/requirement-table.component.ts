import { Component, Input } from "@angular/core";
import * as moment from "moment";

@Component({
  selector: "ngx-requirement-table",
  templateUrl: "./requirement-table.component.html",
  styleUrls: ["./requirement-table.component.scss"],
})
export class RequirementTableComponent {
  @Input() requirements: any[] = [];
  @Input() isForCompany: boolean = false;

  isExtremeFutureDate(momentDate: moment.Moment): boolean {
    return (
      momentDate.isValid() && momentDate.format("DD/MM/YYYY") === "31/12/9999"
    );
  }

  getFormattedDate(date: string | Date | null | undefined): string {
    if (!date) return "-";
    const parsed = moment(date);
    if (!parsed.isValid()) return "-";

    return this.isExtremeFutureDate(parsed)
      ? "N/A"
      : parsed.format("DD/MM/YYYY");
  }
}
