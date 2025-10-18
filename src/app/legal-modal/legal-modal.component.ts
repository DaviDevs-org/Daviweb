import {CommonModule, isPlatformBrowser} from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  HostListener,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-legal-modal',
  templateUrl: './legal-modal.component.html',
  styleUrls: ['./legal-modal.component.scss'],
  imports: [CommonModule]
})
export class LegalModalComponent implements OnChanges {
  @Input() title = '';
  @Input() content = '';       // HTML en bruto
  @Input() visible = false;
  @Output() closeModal = new EventEmitter<void>();

  sanitizedContent: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer, @Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["content"]) {
      // Sanitize / marcar como seguro (solo recomendable para archivos estáticos de assets)
      this.sanitizedContent = this.sanitizer.bypassSecurityTrustHtml(this.content || '');
    }
    if (changes["visible"]) {
      if (isPlatformBrowser(this.platformId)) {
        // bloquear scroll de body cuando esté visible
        document.body.classList.toggle('no-scroll', this.visible);
      }
    }
  }

  close() {
    this.closeModal.emit();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEsc(_event: KeyboardEvent) {
    if (this.visible) this.close();
  }
}
