import { NgOptimizedImage } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
@Component({
  selector: "app-cut",
  templateUrl: "./cut.component.html",
  styleUrls: ["./cut.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports:[NgOptimizedImage]
})
export class CutComponent {
  @Input() title:string = "Low Fade"
  @Input() image:string = "https://images.unsplash.com/photo-1621605815971-fbc98d665033?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=280&q=80"
  @Input() description:string = "Degradado suave que se desvanece bajo, ideal para un look limpio y profesional"
}
