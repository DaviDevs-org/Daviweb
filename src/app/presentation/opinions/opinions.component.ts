import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { OpinionComponent } from './opinion/opinion.component';
@Component({
  selector: "app-opinions",
  templateUrl: "./opinions.component.html",
  styleUrls: ["./opinions.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OpinionComponent
  ]
})
export class OpinionsComponent { }
