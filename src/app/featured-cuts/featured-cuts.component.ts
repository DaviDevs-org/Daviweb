import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { CutComponent } from "./cut/cut.component";
@Component({
  selector: "app-featured-cuts",
  templateUrl: "./featured-cuts.component.html",
  styleUrls: ["./featured-cuts.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CutComponent]
})
export class FeaturedCutsComponent {}
