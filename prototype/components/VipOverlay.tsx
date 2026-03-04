import React from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VipOverlayProps {
  label?: string;
}

const VipOverlay: React.FC<VipOverlayProps> = ({ label = "VIP可见" }) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        navigate('/vip-subscribe');
      }}
      className="absolute inset-0 bg-gray-100/50 backdrop-blur-sm flex flex-col items-center justify-center rounded cursor-pointer z-10 border border-gray-200 group"
    >
      <div className="bg-black/70 text-white px-3 py-1 rounded-full flex items-center gap-1 text-xs shadow-lg transform group-active:scale-95 transition-transform">
        <Lock size={12} />
        <span>{label}</span>
      </div>
    </div>
  );
};

export default VipOverlay;