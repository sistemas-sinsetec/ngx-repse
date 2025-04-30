import { Component } from "@angular/core";
import { NbDialogRef } from "@nebular/theme";

@Component({
  selector: "app-rejection-comment",
  templateUrl: "./rejection-comment.component.html",
  styleUrls: ["./rejection-comment.component.scss"],
})
export class RejectionCommentComponent {
  comment = "";

  constructor(protected dialogRef: NbDialogRef<RejectionCommentComponent>) {}

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    this.dialogRef.close(this.comment);
  }
}
