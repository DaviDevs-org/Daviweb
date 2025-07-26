import { ViewportScroller } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, Input } from "@angular/core";
import { RouterLink } from "@angular/router";
@Component({
  selector: "app-footer",
  templateUrl: "./footer.component.html",
  styleUrls: ["./footer.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:[RouterLink]
})
export class FooterComponent {
  private viewportScroller = inject(ViewportScroller);

  scrollToSection(elementId: string) {
    this.viewportScroller.scrollToAnchor(elementId);
  }
}
