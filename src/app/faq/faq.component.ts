import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import {ButtonComponent} from './button/button.component';
@Component({
  selector: "app-faq",
  templateUrl: "./faq.component.html",
  styleUrls: ["./faq.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent
  ]
})
export class FaqComponent {}
