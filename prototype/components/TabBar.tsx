import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Users, CalendarDays, User, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

/* ------------------------------------------------------------------ */
/*  Badge                                                              */
/* ------------------------------------------------------------------ */

const Badge: React.FC<{ count: number }> = ({ count }) => {
  if (count <= 0) return null;

  const display = count > 99 ? '99+' : String(count);

  return (
    <div
      className={`
        absolute -top-1.5 -right-2
        min-w-[18px] h-[18px] px-1
        bg-red-500 rounded-full
        text-[10px] text-white font-medium
        flex items-center justify-center
        border-2 border-white
        leading-none
      `}
    >
      {display}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Tab item                                                           */
/* ------------------------------------------------------------------ */

interface TabItemProps {
  to: string;
  label: string;
  Icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
  active: boolean;
  badge?: number;
}

const TabItem: React.FC<TabItemProps> = ({ to, label, Icon, active, badge }) => (
  <Link
    to={to}
    className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] active:scale-95 transition-transform duration-150"
  >
    <div className="relative">
      <Icon
        size={24}
        className={`mb-0.5 transition-colors duration-200 ${
          active ? 'text-[#07c160]' : 'text-gray-400'
        }`}
        strokeWidth={active ? 2.5 : 2}
      />
      {badge !== undefined && <Badge count={badge} />}
    </div>
    <span
      className={`text-[10px] leading-tight ${
        active ? 'text-[#07c160] font-medium' : 'text-gray-500'
      }`}
    >
      {label}
    </span>
  </Link>
);

/* ------------------------------------------------------------------ */
/*  TabBar                                                             */
/* ------------------------------------------------------------------ */

const TabBar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { chats } = useApp();

  // Only show TabBar on main tab routes
  const mainTabs = ['/', '/messages', '/team', '/profile'];
  if (!mainTabs.includes(currentPath)) {
    return null;
  }

  // Calculate total unread
  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  return (
    <div
      className="
        fixed bottom-0 left-0 right-0
        bg-white/95 backdrop-blur-md
        border-t border-gray-200
        pt-2 px-6
        pb-[max(env(safe-area-inset-bottom,8px),8px)]
        flex justify-between items-start
        z-50 shadow-[0_-1px_3px_rgba(0,0,0,0.06)]
      "
    >
      <TabItem
        to="/"
        label="约球"
        Icon={CalendarDays}
        active={currentPath === '/'}
      />
      <TabItem
        to="/team"
        label="球队"
        Icon={Users}
        active={currentPath === '/team'}
      />
      <TabItem
        to="/messages"
        label="消息"
        Icon={MessageCircle}
        active={currentPath === '/messages'}
        badge={totalUnread}
      />
      <TabItem
        to="/profile"
        label="我的"
        Icon={User}
        active={currentPath === '/profile'}
      />
    </div>
  );
};

export default TabBar;
