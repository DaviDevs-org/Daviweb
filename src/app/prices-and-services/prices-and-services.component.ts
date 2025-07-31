import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from "@angular/core";
import {PriceAndServiceComponent} from './price-and-service/price-and-service.component';
import { ServiceManager } from "../services/admin-panel/services-management.service";
import { Service } from "../admin-panel/types/admin.types";
import {Subscription} from "rxjs";
import { Auth, onAuthStateChanged, user } from '@angular/fire/auth';

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
  private subscription?: Subscription;
  private cdr = inject(ChangeDetectorRef);
  
  services: Service[] = [];
  loading = true; 

  ngOnInit() {
    onAuthStateChanged(this.auth, user => {
      this.subscription = this.service.getServices().subscribe(services => {
        this.services = services;
        this.loading = false; // ← Aquí cambia a false
        this.cdr.detectChanges();
      });
    });
  }
  
  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}
