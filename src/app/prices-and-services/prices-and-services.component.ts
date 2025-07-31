import { ChangeDetectionStrategy, Component } from "@angular/core";
import {PriceAndServiceComponent} from './price-and-service/price-and-service.component';

@Component({
  selector: "app-services",
  templateUrl: "./prices-and-services.component.html",
  styleUrls: ["./prices-and-services.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PriceAndServiceComponent]
})
export class PricesAndServicesComponent {}
