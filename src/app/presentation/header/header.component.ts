import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID } from "@angular/core";
import { CommonModule, isPlatformBrowser, NgOptimizedImage } from "@angular/common";
import { BusinessStateService } from "@application/state/business-state.service";

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
  private platformId = inject(PLATFORM_ID);

  scrollToSection(sectionId: string) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    window.dispatchEvent(new CustomEvent('force-load-section', { 
      detail: { sectionId } 
    }));

    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      }
    }, 300);
  }
}
