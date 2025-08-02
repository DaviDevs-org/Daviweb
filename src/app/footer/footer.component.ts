import { ViewportScroller } from "@angular/common";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { InfoManager } from "../services/admin-panel/info-management.service";
import { ScheduleService } from "../services/schedule.service";
@Component({
  selector: "app-footer",
  templateUrl: "./footer.component.html",
  styleUrls: ["./footer.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:[RouterLink]
})
export class FooterComponent {
  private viewportScroller = inject(ViewportScroller);
  private info = inject(InfoManager)
  private cdr = inject(ChangeDetectorRef)
  private schedule = inject(ScheduleService)
  
  location:string = "Calle Falsa 123, Ciudad, País"
  telephone:string = "+34 600 000 000"
  email:string = "info&#64;barberiamoderna.com"
  scheduleText: string[] = ["Lunes a Viernes: 10:00-20:00", "Sábado: 9:00-18:00", "Domingo: Cerrado"]

  async ngOnInit(){
    const response = await this.info.getContactInfo()
    this.location = response.address
    this.telephone = response.phone
    this.email = response.email
    const responseSchedule = await this.info.getSchedule()
    this.scheduleText = this.schedule.splitScheduleText(this.schedule.formatScheduleText(responseSchedule))
    this.cdr.detectChanges();
  }

  scrollToSection(elementId: string) {
    this.viewportScroller.scrollToAnchor(elementId);
  }
}
