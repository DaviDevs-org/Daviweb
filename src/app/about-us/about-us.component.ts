import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
@Component({
  selector: "app-about-us",
  templateUrl: "./about-us.component.html",
  styleUrls: ["./about-us.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutUsComponent {}
