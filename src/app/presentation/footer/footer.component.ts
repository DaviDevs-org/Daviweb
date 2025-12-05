import { CommonModule, ViewportScroller } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { BusinessStateService } from "@presentation/shared/business-state.service";
@Component({
  selector: "app-footer",
  templateUrl: "./footer.component.html",
  styleUrls: ["./footer.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CommonModule]
})
export class FooterComponent {
  private viewportScroller = inject(ViewportScroller);
  public state = inject(BusinessStateService);

  scrollToSection(elementId: string) {
    this.viewportScroller.scrollToAnchor(elementId);
  }
}
