import { useEffect, useState } from 'react';
import { getHeaderCollapseProgress, resolveHeaderCollapsed } from './headerCollapseState.js';

interface UseHeaderCollapseOptions {
  enterThreshold?: number;
  exitThreshold?: number;
  progressRange?: number;
}

interface HeaderCollapseState {
  isCollapsed: boolean;
  collapseProgress: number;
}

function readScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function useHeaderCollapse(options: UseHeaderCollapseOptions = {}): HeaderCollapseState {
  const enterThreshold = options.enterThreshold ?? 28;
  const exitThreshold = options.exitThreshold ?? 6;
  const progressRange = options.progressRange ?? 88;

  const [state, setState] = useState<HeaderCollapseState>(() => {
    if (typeof window === 'undefined') {
      return { isCollapsed: false, collapseProgress: 0 };
    }

    const scrollY = readScrollY();
    return {
      isCollapsed: resolveHeaderCollapsed(scrollY, false, { enterThreshold, exitThreshold }),
      collapseProgress: getHeaderCollapseProgress(scrollY, progressRange),
    };
  });

  useEffect(() => {
    let frameId = 0;

    const update = () => {
      frameId = 0;
      const scrollY = readScrollY();

      setState((current) => {
        const isCollapsed = resolveHeaderCollapsed(scrollY, current.isCollapsed, { enterThreshold, exitThreshold });
        const collapseProgress = getHeaderCollapseProgress(scrollY, progressRange);

        if (current.isCollapsed === isCollapsed && Math.abs(current.collapseProgress - collapseProgress) < 0.02) {
          return current;
        }

        return { isCollapsed, collapseProgress };
      });
    };

    const onScroll = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [enterThreshold, exitThreshold, progressRange]);

  return state;
}
