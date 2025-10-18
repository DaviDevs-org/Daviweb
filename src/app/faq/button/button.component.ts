import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import {CommonModule, NgClass} from '@angular/common';
@Component({
  selector: "app-button",
  templateUrl: "./button.component.html",
  styleUrls: ["./button.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass,
    CommonModule
  ]
})
export class ButtonComponent {
  @Input() property1: "Default" | "Deployed" = "Default";
  @Input() questionId!: string;

  question:string = "¿Cómo reservo si aún no está habilitado el sistema online?";
  answer:string = "Siempre puedes llamar por teléfono dentro del horario"
  changeState(){
    if (this.property1==="Default"){
      this.property1 = "Deployed"
    }
    else{
      this.property1 = "Default"
    }
  }
  onKeyDown(event: KeyboardEvent) {
    // Accesibilidad: colapsa/despliega con Enter/Espacio
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.changeState();
    }
  }

}
