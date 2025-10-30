import { Component, ChangeDetectionStrategy, input, model, computed } from '@angular/core';

@Component({
  selector: 'app-toggle',
  template: `
    <label [for]="id()" class="flex items-center justify-between cursor-pointer py-1">
      <span class="font-medium text-slate-300 text-sm">{{ label() }}</span>
      <div class="relative">
        <input 
          type="checkbox" 
          [id]="id()" 
          class="sr-only peer" 
          [checked]="value()" 
          (change)="onToggleChange($event)"
        />
        <div class="block bg-slate-600 w-12 h-7 rounded-full peer-checked:bg-sky-500 transition-colors"></div>
        <div class="dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-full"></div>
      </div>
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToggleComponent {
  label = input.required<string>();
  value = model.required<boolean>();
  
  id = computed(() => `toggle-${this.label().toLowerCase().replace(/\s+/g, '-')}`);

  onToggleChange(event: Event): void {
    this.value.set((event.target as HTMLInputElement).checked);
  }
}
