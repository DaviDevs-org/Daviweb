import { ChangeDetectionStrategy, Component, inject, Input } from "@angular/core";
import { OpinionComponent } from './opinion/opinion.component';
import { SaasConfigService } from "src/app/config/saas-config.service";
@Component({
  selector: "app-opinions",
  templateUrl: "./opinions.component.html",
  styleUrls: ["./opinions.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OpinionComponent
  ]
})
export class OpinionsComponent { 
  public saasConfig = inject(SaasConfigService).getAll().business
}
