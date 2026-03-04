import React from 'react';
import { MoreHorizontal, Circle, ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavBarProps {
  title: string;
  showBack?: boolean;
}

const NavBar: React.FC<NavBarProps> = ({ title, showBack = false }) => {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 bg-white z-40 border-b border-gray-100 px-4 h-12 flex items-center justify-between">
      <div className="w-16 flex items-center">
        {showBack && (
          <button onClick={() => navigate(-1)} className="text-gray-800 p-1 -ml-2">
            <ChevronLeft size={24} />
          </button>
        )}
      </div> 
      <h1 className="font-semibold text-gray-800 text-base truncate">{title}</h1>
      <div className="w-16 flex justify-end gap-1">
          <div className="border border-gray-200 rounded-full px-2 py-1 flex items-center gap-2 bg-white/50">
            <MoreHorizontal size={16} className="text-gray-800" />
            <div className="w-[1px] h-4 bg-gray-200"></div>
            <Circle size={16} className="text-gray-800" />
          </div>
      </div>
    </div>
  );
};

export default NavBar;