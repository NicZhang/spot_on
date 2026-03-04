import React, { useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ActionSheetAction {
  text: string;
  type?: 'default' | 'danger' | 'primary';
  onClick: () => void;
}

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actions: ActionSheetAction[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ActionSheet: React.FC<ActionSheetProps> = ({
  visible,
  onClose,
  title,
  description,
  actions,
}) => {
  // Internal state to keep DOM mounted during exit animation
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Trigger enter animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!mounted) return null;

  const actionTextColor = (type?: 'default' | 'danger' | 'primary') => {
    switch (type) {
      case 'danger':
        return 'text-red-500';
      case 'primary':
        return 'text-[#07c160] font-medium';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 z-[9990]" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className={`
          absolute inset-0 bg-black/40 transition-opacity duration-300
          ${animating ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`
          absolute bottom-0 left-0 right-0
          transition-transform duration-300 ease-out
          ${animating ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        <div className="mx-2 mb-2">
          {/* Main actions group */}
          <div className="bg-white rounded-xl overflow-hidden">
            {/* Header */}
            {(title || description) && (
              <div className="px-4 pt-4 pb-3 text-center border-b border-gray-100">
                {title && (
                  <p className="text-sm font-medium text-gray-800">{title}</p>
                )}
                {description && (
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                className={`
                  w-full py-3.5 text-center text-base
                  active:bg-gray-50 transition-colors
                  ${actionTextColor(action.type)}
                  ${index < actions.length - 1 ? 'border-b border-gray-100' : ''}
                `}
              >
                {action.text}
              </button>
            ))}
          </div>

          {/* Cancel button - separated with gap */}
          <div className="mt-2">
            <button
              onClick={onClose}
              className="w-full py-3.5 text-center text-base text-gray-600 font-medium bg-white rounded-xl active:bg-gray-50 transition-colors"
            >
              取消
            </button>
          </div>
        </div>

        {/* Safe area spacer */}
        <div className="h-[env(safe-area-inset-bottom,0px)] bg-transparent" />
      </div>
    </div>
  );
};

export default ActionSheet;
