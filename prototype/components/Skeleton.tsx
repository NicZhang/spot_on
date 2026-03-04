import React from 'react';

/* ------------------------------------------------------------------ */
/*  Shared shimmer keyframe style                                      */
/*  Tailwind's animate-pulse is close, but we add a subtle gradient    */
/*  shimmer for a more polished loading effect.                        */
/* ------------------------------------------------------------------ */

const shimmerClass =
  'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded';

/* ------------------------------------------------------------------ */
/*  SkeletonCard - Match card placeholder (Matching page)              */
/* ------------------------------------------------------------------ */

interface SkeletonCountProps {
  count?: number;
}

export const SkeletonCard: React.FC<SkeletonCountProps> = ({ count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="bg-white rounded-2xl p-4 shadow-sm space-y-3"
      >
        {/* Header: avatar + name + badge */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${shimmerClass}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-4 w-28 ${shimmerClass}`} />
            <div className={`h-3 w-20 ${shimmerClass}`} />
          </div>
          <div className={`h-6 w-16 rounded-full ${shimmerClass}`} />
        </div>

        {/* Info row */}
        <div className="flex gap-3">
          <div className={`h-3 w-16 ${shimmerClass}`} />
          <div className={`h-3 w-24 ${shimmerClass}`} />
          <div className={`h-3 w-12 ${shimmerClass}`} />
        </div>

        {/* Tags row */}
        <div className="flex gap-2">
          <div className={`h-6 w-14 rounded-full ${shimmerClass}`} />
          <div className={`h-6 w-20 rounded-full ${shimmerClass}`} />
          <div className={`h-6 w-16 rounded-full ${shimmerClass}`} />
        </div>

        {/* Bottom bar */}
        <div className="flex justify-between items-center pt-1">
          <div className={`h-5 w-24 ${shimmerClass}`} />
          <div className={`h-9 w-20 rounded-lg ${shimmerClass}`} />
        </div>
      </div>
    ))}
  </>
);

/* ------------------------------------------------------------------ */
/*  SkeletonList - List item placeholder (team members, chat list)     */
/* ------------------------------------------------------------------ */

export const SkeletonList: React.FC<SkeletonCountProps> = ({ count = 3 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 px-4 py-3 bg-white"
      >
        <div className={`w-11 h-11 rounded-full shrink-0 ${shimmerClass}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-4 w-32 ${shimmerClass}`} />
          <div className={`h-3 w-48 ${shimmerClass}`} />
        </div>
        <div className={`h-3 w-10 ${shimmerClass}`} />
      </div>
    ))}
  </>
);

/* ------------------------------------------------------------------ */
/*  SkeletonProfile - Avatar + text block (profile header, player)     */
/* ------------------------------------------------------------------ */

export const SkeletonProfile: React.FC<SkeletonCountProps> = ({ count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="flex flex-col items-center gap-3 py-6"
      >
        {/* Avatar */}
        <div className={`w-20 h-20 rounded-full ${shimmerClass}`} />

        {/* Name */}
        <div className={`h-5 w-24 ${shimmerClass}`} />

        {/* Subtitle */}
        <div className={`h-3 w-36 ${shimmerClass}`} />

        {/* Stats row */}
        <div className="flex gap-6 mt-2">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`h-5 w-10 ${shimmerClass}`} />
            <div className={`h-3 w-8 ${shimmerClass}`} />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className={`h-5 w-10 ${shimmerClass}`} />
            <div className={`h-3 w-8 ${shimmerClass}`} />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className={`h-5 w-10 ${shimmerClass}`} />
            <div className={`h-3 w-8 ${shimmerClass}`} />
          </div>
        </div>
      </div>
    ))}
  </>
);
