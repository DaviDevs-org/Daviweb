import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import {NgClass} from '@angular/common';
@Component({
  selector: "app-star",
  templateUrl: "./star.component.html",
  styleUrls: ["./star.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass
  ]
})
export class StarComponent {
  @Input() property1: "Default" | "Empty" = "Default";
}
