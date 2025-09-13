import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Injector, Input, runInInjectionContext } from "@angular/core";
import { ScheduleService } from "../services/schedule.service";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import {InfoManager} from '../services/admin-panel/info-management.service';
import {ContactInfo} from '../admin-panel/types/admin.types';
@Component({
  selector: "app-location-and-contact",
  templateUrl: "./location-and-contact.component.html",
  styleUrls: ["./location-and-contact.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationAndContactComponent {
  private format = inject(ScheduleService)
  private info = inject(InfoManager)
  private injector = inject(Injector)
  private sanitizer = inject(DomSanitizer)
  private cdr = inject(ChangeDetectorRef)
  scheduleText:string[] = ['']
  contactInfo:ContactInfo | undefined
  coords: SafeResourceUrl | null = null
  ngOnInit(){
    runInInjectionContext(this.injector, async() =>{
      const scheduleInfo = await this.info.getSchedule()
      this.scheduleText = this.format.splitScheduleText(this.format.formatScheduleText(scheduleInfo))
      this.contactInfo = await this.info.getContactInfo()
      const coord = `https://www.google.com/maps?q=${encodeURIComponent(this.contactInfo.address)}&output=embed`
      this.coords = this.sanitizer.bypassSecurityTrustResourceUrl(coord)
      this.cdr.markForCheck();
    })
  }
}
