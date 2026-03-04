import React from 'react';
import { MoreHorizontal, Circle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NavBarAction {
  icon: React.ReactNode;
  onClick: () => void;
  ariaLabel?: string;
}

interface NavBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  /** Render custom action buttons on the right side */
  rightActions?: NavBarAction[];
  /** If true, hides the default WeChat capsule (MoreHorizontal + Circle) */
  hideDefaultRight?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const NavBar: React.FC<NavBarProps> = ({
  title,
  subtitle,
  showBack = false,
  rightActions,
  hideDefaultRight = false,
}) => {
  const navigate = useNavigate();

  const hasCustomRight = rightActions && rightActions.length > 0;

  return (
    <div
      className="
        sticky top-0 z-40
        backdrop-blur-md bg-white/90
        border-b border-gray-100
        px-4
        pt-[env(safe-area-inset-top,0px)]
      "
    >
      <div className="h-12 flex items-center justify-between">
        {/* Left: Back button or spacer */}
        <div className="w-16 flex items-center shrink-0">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="text-gray-800 p-1.5 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 transition-transform"
              aria-label="返回"
            >
              <ChevronLeft size={24} />
            </button>
          )}
        </div>

        {/* Center: Title + optional subtitle */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-2">
          <h1 className="font-semibold text-gray-800 text-base truncate max-w-full leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[10px] text-gray-400 truncate max-w-full leading-tight mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right: Custom actions or default capsule */}
        <div className="w-16 flex justify-end items-center gap-1 shrink-0">
          {hasCustomRight ? (
            <div className="flex items-center gap-0.5">
              {rightActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-700 active:scale-95 transition-transform"
                  aria-label={action.ariaLabel}
                >
                  {action.icon}
                </button>
              ))}
            </div>
          ) : !hideDefaultRight ? (
            <div className="border border-gray-200 rounded-full px-2 py-1 flex items-center gap-2 bg-white/50">
              <MoreHorizontal size={16} className="text-gray-800" />
              <div className="w-[1px] h-4 bg-gray-200" />
              <Circle size={16} className="text-gray-800" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default NavBar;
