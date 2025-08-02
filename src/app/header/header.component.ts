import { ViewportScroller } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, Input, OnInit } from "@angular/core";
import { InfoManager } from "../services/admin-panel/info-management.service";
import { toSignal } from "@angular/core/rxjs-interop";
import { from } from "rxjs";
@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent{
  private viewportScroller = inject(ViewportScroller);
  private info = inject(InfoManager)

  businessInfo = toSignal(from(this.info.isBusinessOpen()), {initialValue:{isOpen: false, currentDay:''}});
  
  scrollToSection(elementId: string) {
    this.viewportScroller.scrollToAnchor(elementId);
  }
}
