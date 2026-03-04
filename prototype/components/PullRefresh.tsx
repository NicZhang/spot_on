import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PullRefreshProps {
  /** Called when the user releases past the pull threshold */
  onRefresh: () => Promise<void> | void;
  /** Content to render inside the scrollable area */
  children: React.ReactNode;
  /** Pull distance threshold in px, default 60 */
  threshold?: number;
  /** Simulated delay in ms when onRefresh returns void, default 1000 */
  simulatedDelay?: number;
}

type PullState = 'idle' | 'pulling' | 'ready' | 'refreshing';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const PullRefresh: React.FC<PullRefreshProps> = ({
  onRefresh,
  children,
  threshold = 60,
  simulatedDelay = 1000,
}) => {
  const [state, setState] = useState<PullState>('idle');
  const [pullDistance, setPullDistance] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  /* ---- Touch handlers ---- */

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (state === 'refreshing') return;

      const container = containerRef.current;
      if (!container || container.scrollTop > 0) return;

      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    },
    [state],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPullingRef.current || state === 'refreshing') return;

      const container = containerRef.current;
      if (!container || container.scrollTop > 0) {
        isPullingRef.current = false;
        setPullDistance(0);
        setState('idle');
        return;
      }

      const currentY = e.touches[0].clientY;
      const delta = currentY - startYRef.current;

      if (delta <= 0) {
        setPullDistance(0);
        setState('idle');
        return;
      }

      // Dampened pull: the further you pull, the harder it gets
      const dampened = Math.min(delta * 0.5, threshold * 2);
      setPullDistance(dampened);
      setState(dampened >= threshold ? 'ready' : 'pulling');
    },
    [state, threshold],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (state === 'ready') {
      setState('refreshing');
      setPullDistance(threshold);

      const result = onRefresh();

      if (result instanceof Promise) {
        await result;
      } else {
        await new Promise((res) => setTimeout(res, simulatedDelay));
      }

      setState('idle');
      setPullDistance(0);
    } else {
      setState('idle');
      setPullDistance(0);
    }
  }, [state, threshold, onRefresh, simulatedDelay]);

  /* ---- Prevent body scroll while pulling ---- */
  useEffect(() => {
    if (state === 'pulling' || state === 'ready') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [state]);

  /* ---- Indicator content ---- */

  const indicatorContent = () => {
    switch (state) {
      case 'pulling':
        return (
          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <ArrowDown
              size={14}
              className="transition-transform duration-200"
            />
            <span>下拉刷新</span>
          </div>
        );
      case 'ready':
        return (
          <div className="flex items-center gap-1.5 text-[#07c160] text-xs">
            <ArrowDown
              size={14}
              className="rotate-180 transition-transform duration-200"
            />
            <span>释放刷新</span>
          </div>
        );
      case 'refreshing':
        return (
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Loader2 size={14} className="animate-spin" />
            <span>正在刷新...</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto overscroll-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{
          height: pullDistance > 0 ? `${pullDistance}px` : 0,
          transition: state === 'pulling' || state === 'ready' ? 'none' : undefined,
        }}
      >
        {indicatorContent()}
      </div>

      {/* Actual content */}
      {children}
    </div>
  );
};

export default PullRefresh;
