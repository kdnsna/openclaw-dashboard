export interface HeaderCollapseOptions {
  enterThreshold?: number;
  exitThreshold?: number;
}

export declare function resolveHeaderCollapsed(
  scrollY: number,
  previousCollapsed: boolean,
  options?: HeaderCollapseOptions,
): boolean;

export declare function getHeaderCollapseProgress(scrollY: number, progressRange?: number): number;
