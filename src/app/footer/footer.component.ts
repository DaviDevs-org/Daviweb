import { CommonModule, ViewportScroller } from "@angular/common";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { InfoManager } from "../services/admin-panel/info-management.service";
import { ScheduleService } from "../services/schedule.service";
import { LegalModalComponent } from "../legal-modal/legal-modal.component";
@Component({
  selector: "app-footer",
  templateUrl: "./footer.component.html",
  styleUrls: ["./footer.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LegalModalComponent, CommonModule]
})
export class FooterComponent {
  private viewportScroller = inject(ViewportScroller);
  private info = inject(InfoManager)
  private cdr = inject(ChangeDetectorRef)
  private schedule = inject(ScheduleService)

  location: string = "Calle Referéndum de Vita Grande, 28925 Alcorcón, Madrid"
  telephone: string = "+34 916 42 56 60"
  scheduleText: string[] = ["Lunes a Viernes: 10:00-20:00", "Sábado: 9:00-18:00", "Domingo: Cerrado"]

  legalVisible = false;
  legalTitle = '';
  legalContent = '';
  loading = false;

  private scrollY: number = 0;

  async ngOnInit() {
    const response = await this.info.getContactInfo()
    this.location = response.address
    this.telephone = response.phone
    const responseSchedule = await this.info.getSchedule()
    this.scheduleText = this.schedule.splitScheduleText(this.schedule.formatScheduleText(responseSchedule))
    this.cdr.detectChanges();
  }

  scrollToSection(elementId: string) {
    this.viewportScroller.scrollToAnchor(elementId);
  }

  async openLegal(type: 'aviso' | 'privacidad') {
    const filename = type === 'aviso' ? 'AVISO-LEGAL.html' : 'POLITICA-PRIVACIDAD.html';
    const path = `../../assets/legal/${filename}`;

    this.loading = true;
    this.legalContent = '';
    this.legalTitle = type === 'aviso' ? 'Aviso Legal' : 'Política de Privacidad';
    this.legalVisible = true; // abrimos modal de inmediato (para mostrar spinner)

    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Error al cargar (${res.status})`);
      }

      let text = await res.text();
      const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch && bodyMatch[1]) text = bodyMatch[1];
      text = text.replace(/<!doctype[^>]*>/i, '')
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
        .replace(/<html[^>]*>|<\/html>/gi, '')
        .trim();

      if (!text) throw new Error('El documento está vacío o tiene un formato no compatible.');
      this.legalContent = text;
      this.scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${this.scrollY}px`;

    } catch (err: any) {
      this.legalContent = `<p style="color:#a00"><strong>Error:</strong> ${err?.message || 'No se ha podido cargar el documento legal.'
        }</p>`;
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  closeModal() {
    this.legalVisible = false;
    this.loading = false;
    const y = this.scrollY;
    const html = document.documentElement;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';

    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    html.style.scrollBehavior = '';


  }
}
