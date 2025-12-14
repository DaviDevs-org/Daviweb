import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID } from "@angular/core";
import { CommonModule, isPlatformBrowser, NgOptimizedImage } from "@angular/common";
import { BusinessStateService } from "@presentation/shared/business-state.service";
import { ScrollService } from "@presentation/shared/scroll.service";
import { SaasConfigService } from "src/app/config/saas-config.service";

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.scss"],
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  public state = inject(BusinessStateService);
  private scrollService = inject(ScrollService);
  public saasConfig = inject(SaasConfigService).getAll();

  scrollToSection(sectionId: string) {
    this.scrollService.scrollToSection(sectionId);
  }
}
