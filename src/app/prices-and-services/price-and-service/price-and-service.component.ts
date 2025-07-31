import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
@Component({
  selector: "app-service",
  templateUrl: "./price-and-service.component.html",
  styleUrls: ["./price-and-service.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceAndServiceComponent {
  @Input() name:string = "Corte Clásico"
  @Input() time:number = 25
  @Input() price:number = 20
}
