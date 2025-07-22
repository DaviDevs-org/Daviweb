import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import {StarComponent} from '../star/star.component';
@Component({
  selector: "app-opinion",
  templateUrl: "./opinion.component.html",
  styleUrls: ["./opinion.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    StarComponent
  ]
})
export class OpinionComponent {}
