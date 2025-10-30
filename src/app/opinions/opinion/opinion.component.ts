import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { StarComponent } from "./star/star.component";

@Component({
  selector: "app-opinion",
  templateUrl: "./opinion.component.html",
  styleUrls: ["./opinion.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    StarComponent
  ]
})
export class OpinionComponent {
  @Input() platform: string = "Google";
  @Input() userName: string = "Miguel A."
  @Input() opinionText: string = "Ambiente genial, buenos precios y atención personalizada. Y gracias al sistema de reservas no hay que hacer tiempos de espera.";
}
