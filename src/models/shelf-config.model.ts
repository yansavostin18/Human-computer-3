export type MaterialType = 'Gloss White' | 'Matte Black';
export type EdgeProfileType = 'Sharp 90°' | 'Rounded/Beveled';

export interface ShelfConfig {
  width: number;
  height: number;
  depth: number;
  horizontalLevels: number;
  verticalDivisions: number;
  boardThickness: number;
  material: MaterialType;
  edgeProfile: EdgeProfileType;
  doors: boolean;
  lamps: boolean;
  hangers: boolean;
}