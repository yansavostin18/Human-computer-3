
import { Component, ChangeDetectionStrategy, input, model, computed } from '@angular/core';

@Component({
  selector: 'app-slider',
  template: `
    <div class="flex flex-col space-y-2">
      <div class="flex justify-between items-center">
        <label [for]="id()" class="font-medium text-slate-300 text-sm">{{ label() }}</label>
        <span class="text-sm font-mono bg-slate-700 px-2 py-0.5 rounded">{{ valueWithUnit() }}</span>
      </div>
      <input
        [id]="id()"
        type="range"
        [min]="min()"
        [max]="max()"
        [step]="step()"
        [value]="value()"
        (input)="onInputChange($event)"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SliderComponent {
  label = input.required<string>();
  min = input.required<number>();
  max = input.required<number>();
  step = input<number>(1);
  unit = input<string>('');
  
  value = model.required<number>();

  id = computed(() => `slider-${this.label().toLowerCase().replace(' ', '-')}`);
  valueWithUnit = computed(() => `${this.value()}${this.unit()}`);

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(Number(target.value));
  }
}
