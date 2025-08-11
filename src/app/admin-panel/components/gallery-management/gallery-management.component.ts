// gallery-management.component.ts
import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GalleryPhoto } from '../../types/admin.types';
import { GalleryService } from '../../../services/admin-panel/gallery-management.service';
import { Subscription } from 'rxjs';
import { percentage } from '@angular/fire/storage';


@Component({
  selector: 'app-gallery-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./gallery-management.component.html",
  styleUrls: ['./gallery-management.component.scss']
})
export class GalleryManagementComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  private gallery = inject(GalleryService)

  selectedFile: File | null = null;
  progress = signal('0%');
  susbscription: Subscription | undefined = undefined;
  galleryPhotos = signal<GalleryPhoto[]>([])

  async ngOnInit() {
    const images = await this.gallery.getImages()

    const gallery = await this.gallery.getImageInfo(images)
    this.galleryPhotos.set(gallery)
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

      if (!allowedTypes.includes(file.type)) {
        alert('Por favor, selecciona una imagen JPG, PNG o WebP.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }
      this.selectedFile = file;
    }
  }

  getImagePreview(): string {
    if (this.selectedFile) {
      return URL.createObjectURL(this.selectedFile);
    }
    return '';
  }

  uploadImage() {
    if (!this.selectedFile) {
      alert('Por favor, selecciona una imagen primero.');
      return;
    }

    const task = this.gallery.uploadImage(this.selectedFile);
    if (!task) { return; }

    if (this.susbscription) {
      this.susbscription.unsubscribe();
      this.susbscription = undefined;
    }

    this.susbscription = percentage(task).subscribe(({ progress }) => {
      this.progress.set(`${progress}%`);
    });

    task.on('state_changed',
      null,
      (error) => {
        console.error('Error al subir:', error);
      },
      async () => {
        const downloadURL = await this.gallery.getUrl(task.snapshot.ref);

        this.galleryPhotos.update(images => [
          ...images,
          new GalleryPhoto(
            this.selectedFile!.name,
            downloadURL,
            this.selectedFile!.lastModified.toString(),
            task.snapshot.ref.name
          )
        ]);

        this.selectedFile = null;
        setTimeout(() => {
          alert('Foto subida con éxito');
          this.progress.set('0%');
        }, 400);
      }
    );
  }

  async deleteImage(i: number) {
    const id = this.galleryPhotos()[i].id!
    const response = await this.gallery.deleteImage(id)
    this.galleryPhotos.update(photos =>
      photos.filter((_, index) => index !== i)
    );
    alert("Foto eliminada con éxito")
  }
  
  async updateImage(i: number) {
    const id = this.galleryPhotos()[i].id!;
    let newName: string | null = "";
    while (true) {
      newName = prompt('Introduzca un nuevo nombre para la imagen')
      if (newName === null) continue;
      if (newName!.trim() !== '') break;
    }
    newName = newName + '.' + this.galleryPhotos()[i].name.split('.').pop()
    const response = await this.gallery.updateImage(id, newName)
    this.galleryPhotos.update(photos => {
      const updated = [...photos];
      updated[i] = {
        ...updated[i],
        name: newName
      };
      return updated;
    });
  }

}