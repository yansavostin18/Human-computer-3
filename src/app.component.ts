import { Component, ChangeDetectionStrategy, signal, viewChild, ElementRef, AfterViewInit, effect, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShelfConfig, MaterialType, EdgeProfileType } from './models/shelf-config.model';
import { ThreeService } from './services/three.service';
import { SliderComponent } from './components/slider.component';
import { ToggleComponent } from './components/toggle.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [CommonModule, SliderComponent, ToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements AfterViewInit {
  private threeService = inject(ThreeService);
  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  // I. Dimensions
  width = signal(150);
  height = signal(200);
  depth = new signal(30);

  // II. Structure
  horizontalLevels = signal(4);
  verticalDivisions = signal(3);

  // III. Materiality
  boardThickness = signal(2);
  material = signal<MaterialType>('Gloss White');
  
  // IV. Advanced
  edgeProfile = signal<EdgeProfileType>('Sharp 90°');

  // V. Add-ons
  doors = signal(false);
  lamps = signal(false);
  hangers = signal(false);

  // Combined configuration signal
  config = computed<ShelfConfig>(() => ({
    width: this.width(),
    height: this.height(),
    depth: this.depth(),
    horizontalLevels: this.horizontalLevels(),
    verticalDivisions: this.verticalDivisions(),
    boardThickness: this.boardThickness(),
    material: this.material(),
    edgeProfile: this.edgeProfile(),
    doors: this.doors(),
    lamps: this.lamps(),
    hangers: this.hangers(),
  }));

  constructor() {
    // Effect to react to any configuration change OR canvas availability
    // and update the 3D model.
    effect(() => {
      const canvasEl = this.canvas(); // Create dependency on canvas view child
      if (canvasEl) {
        // Only proceed if the canvas is ready
        const currentConfig = this.config(); // Create dependency on config
        this.threeService.updateBookshelf(currentConfig);
      }
    });
  }

  ngAfterViewInit(): void {
    // Initialize the Three.js scene once the canvas is available in the DOM.
    // The effect will automatically trigger the first `updateBookshelf` call
    // because the `this.canvas()` signal will be populated.
    this.threeService.init(this.canvas().nativeElement);
  }

  onMaterialChange(event: Event): void {
    const selectedMaterial = (event.target as HTMLSelectElement).value as MaterialType;
    this.material.set(selectedMaterial);
  }

  onEdgeProfileChange(event: Event): void {
    const selectedProfile = (event.target as HTMLSelectElement).value as EdgeProfileType;
    this.edgeProfile.set(selectedProfile);
  }
}