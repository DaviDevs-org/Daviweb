import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import {NgClass} from '@angular/common';
@Component({
  selector: "app-button",
  templateUrl: "./button.component.html",
  styleUrls: ["./button.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass
  ]
})
export class ButtonComponent {
  @Input() property1: "Default" | "Deployed" = "Default";
}
