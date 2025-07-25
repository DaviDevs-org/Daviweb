import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { ServiceComponent } from "./service/service.component";
@Component({
  selector: "app-services",
  templateUrl: "./services.component.html",
  styleUrls: ["./services.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ServiceComponent]
})
export class ServicesComponent {}
