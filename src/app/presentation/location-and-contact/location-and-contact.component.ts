import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Injector, Input, runInInjectionContext } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { BusinessStateService } from "@application/state/business-state.service";
@Component({
  selector: "app-location-and-contact",
  templateUrl: "./location-and-contact.component.html",
  styleUrls: ["./location-and-contact.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationAndContactComponent {
  public state = inject(BusinessStateService)
  private sanitizer = inject(DomSanitizer)
  coords: SafeResourceUrl | null = null
  ngOnInit(){
    const coord = `https://www.google.com/maps?q=${encodeURIComponent(this.state.contactInfo().address)}&output=embed`
    this.coords = this.sanitizer.bypassSecurityTrustResourceUrl(coord)
  }
}
