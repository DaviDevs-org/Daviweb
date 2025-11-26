import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import {NgOptimizedImage} from '@angular/common';
@Component({
  selector: "app-about-us",
  templateUrl: "./about-us.component.html",
  styleUrls: ["./about-us.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgOptimizedImage
  ]
})
export class AboutUsComponent {}
