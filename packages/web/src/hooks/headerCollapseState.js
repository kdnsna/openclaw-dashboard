export function resolveHeaderCollapsed(scrollY, previousCollapsed, options = {}) {
  const enterThreshold = options.enterThreshold ?? 40;
  const exitThreshold = options.exitThreshold ?? 12;

  if (scrollY >= enterThreshold) {
    return true;
  }

  if (scrollY <= exitThreshold) {
    return false;
  }

  return previousCollapsed;
}

export function getHeaderCollapseProgress(scrollY, progressRange = 120) {
  if (progressRange <= 0) {
    return 1;
  }

  const progress = scrollY / progressRange;
  return Math.min(Math.max(progress, 0), 1);
}
