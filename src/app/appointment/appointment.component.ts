import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
@Component({
  selector: "app-appointment",
  templateUrl: "./appointment.component.html",
  styleUrls: ["./appointment.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentComponent {}
