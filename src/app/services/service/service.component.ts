import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
@Component({
  selector: "app-service",
  templateUrl: "./service.component.html",
  styleUrls: ["./service.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceComponent {
  @Input() name:string = "Corte Clásico"
  @Input() time:number = 25
  @Input() price:number = 20
}
