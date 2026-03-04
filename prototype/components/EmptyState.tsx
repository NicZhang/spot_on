import React from 'react';
import { Inbox } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  /** lucide-react icon node, defaults to <Inbox /> */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center select-none">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        {icon ? (
          <span className="text-gray-400">{icon}</span>
        ) : (
          <Inbox size={28} className="text-gray-400" />
        )}
      </div>

      {/* Title */}
      <h3 className="text-base font-medium text-gray-600 mb-1">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-400 max-w-[240px] leading-relaxed">
          {description}
        </p>
      )}

      {/* CTA Button */}
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-5 py-2.5 bg-[#07c160] text-white text-sm font-medium rounded-full active:scale-95 transition-transform shadow-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
