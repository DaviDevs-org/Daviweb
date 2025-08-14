import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Injector, OnDestroy, OnInit, runInInjectionContext } from "@angular/core";
import { PriceAndServiceComponent } from './price-and-service/price-and-service.component';
import { ServiceManager } from "../services/admin-panel/services-management.service";
import { Service } from "../admin-panel/types/admin.types";
import { Subscription } from "rxjs";
import { Auth } from '@angular/fire/auth';

@Component({
  selector: "app-services",
  templateUrl: "./prices-and-services.component.html",
  styleUrls: ["./prices-and-services.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PriceAndServiceComponent]
})
export class PricesAndServicesComponent implements OnInit, OnDestroy {
  private service = inject(ServiceManager);
  private auth = inject(Auth);
  private cdr = inject(ChangeDetectorRef);
  private injector = inject(Injector);

  private subscriptions: Subscription[] = [];

  services: Service[] = [];
  loading = true;

  ngOnInit() {
    runInInjectionContext(this.injector, () => {
      const s1 = this.service.getServices().subscribe(services => {
        this.services = services;
        this.loading = false;
        this.cdr.detectChanges();
      }, err => {
        console.error('Error cargando servicios:', err);
        this.loading = false;
        this.cdr.detectChanges();
      });

      this.subscriptions.push(s1);
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}
