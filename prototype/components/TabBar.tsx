import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Users, CalendarDays, User, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-6 flex justify-between items-center z-50 h-20 shadow-lg">
      <Link to="/" className="flex flex-col items-center w-16">
        <CalendarDays 
          size={24} 
          className={`mb-1 transition-colors ${currentPath === '/' ? 'text-[#07c160]' : 'text-gray-400'}`} 
          strokeWidth={currentPath === '/' ? 2.5 : 2}
        />
        <span className={`text-[10px] ${currentPath === '/' ? 'text-[#07c160] font-medium' : 'text-gray-500'}`}>
          约球
        </span>
      </Link>

      <Link to="/team" className="flex flex-col items-center w-16">
        <Users 
          size={24} 
          className={`mb-1 transition-colors ${currentPath === '/team' ? 'text-[#07c160]' : 'text-gray-400'}`} 
          strokeWidth={currentPath === '/team' ? 2.5 : 2}
        />
        <span className={`text-[10px] ${currentPath === '/team' ? 'text-[#07c160] font-medium' : 'text-gray-500'}`}>
          球队
        </span>
      </Link>

      <Link to="/messages" className="flex flex-col items-center w-16 relative">
        <div className="relative">
            <MessageCircle 
              size={24} 
              className={`mb-1 transition-colors ${currentPath === '/messages' ? 'text-[#07c160]' : 'text-gray-400'}`} 
              strokeWidth={currentPath === '/messages' ? 2.5 : 2}
            />
            {totalUnread > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center border border-white">
                    {totalUnread}
                </div>
            )}
        </div>
        <span className={`text-[10px] ${currentPath === '/messages' ? 'text-[#07c160] font-medium' : 'text-gray-500'}`}>
          消息
        </span>
      </Link>

      <Link to="/profile" className="flex flex-col items-center w-16">
        <User 
          size={24} 
          className={`mb-1 transition-colors ${currentPath === '/profile' ? 'text-[#07c160]' : 'text-gray-400'}`} 
          strokeWidth={currentPath === '/profile' ? 2.5 : 2}
        />
        <span className={`text-[10px] ${currentPath === '/profile' ? 'text-[#07c160] font-medium' : 'text-gray-500'}`}>
          我的
        </span>
      </Link>
    </div>
  );
};

export default TabBar;