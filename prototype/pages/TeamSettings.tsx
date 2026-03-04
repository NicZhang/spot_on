import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { useApp } from '../context/AppContext';
import { Shirt, Camera, ChevronRight, User, Lock, Crown } from 'lucide-react';
import { UserRole } from '../types';

const TeamSettings: React.FC = () => {
  const navigate = useNavigate();
  const { myTeam, updateTeamInfo, role, toggleVip } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isVip = role === UserRole.VIP_CAPTAIN;

  // Form State
  const [formData, setFormData] = useState({
    name: myTeam.name,
    announcement: myTeam.announcement || '',
    logo: myTeam.logo,
    homeJerseyColor: myTeam.homeJerseyColor || '#3b82f6',
    awayJerseyColor: myTeam.awayJerseyColor || '#ffffff',
    gender: myTeam.gender || 'male'
  });

  const jerseyColors = [
    { name: '蓝', hex: '#3b82f6' },
    { name: '红', hex: '#ef4444' },
    { name: '白', hex: '#ffffff' },
    { name: '黑', hex: '#000000' },
    { name: '黄', hex: '#eab308' },
    { name: '绿', hex: '#22c55e' },
    { name: '橙', hex: '#f97316' },
    { name: '紫', hex: '#a855f7' },
    { name: '粉', hex: '#ec4899' },
    { name: '青', hex: '#06b6d4' },
    { name: '深蓝', hex: '#1e3a8a' },
    { name: '酒红', hex: '#7f1d1d' },
  ];

  const handleSave = () => {
    updateTeamInfo({
      name: formData.name,
      announcement: formData.announcement,
      logo: formData.logo,
      homeJerseyColor: formData.homeJerseyColor,
      awayJerseyColor: formData.awayJerseyColor,
      gender: formData.gender
    });
    navigate(-1);
  };

  const handleLogoClick = () => {
    if (!isVip) {
        if(confirm("自定义队徽是 VIP 专属功能。\n打造专业球队形象，是否立即升级？")) {
            toggleVip();
        }
        return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      <NavBar title="球队设置" showBack={true} />

      <div className="p-4 space-y-4">
        
        {/* Logo Section */}
        <div className="bg-white rounded-xl p-6 flex flex-col items-center justify-center space-y-3">
            <div className="relative group cursor-pointer" onClick={handleLogoClick}>
                <img 
                    src={formData.logo} 
                    alt="Team Logo" 
                    className={`w-24 h-24 rounded-full object-cover border-4 border-gray-100 group-hover:opacity-80 transition-opacity ${!isVip ? 'grayscale-[0.5]' : ''}`} 
                />
                
                {/* Overlay Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
                    {isVip ? (
                        <Camera className="text-white drop-shadow-md" size={32} />
                    ) : (
                        <Lock className="text-white drop-shadow-md" size={32} />
                    )}
                </div>

                {/* Badge */}
                <div className={`absolute bottom-0 right-0 ${isVip ? 'bg-gray-900' : 'bg-yellow-500'} text-white p-1.5 rounded-full border-2 border-white`}>
                    {isVip ? <Camera size={14} /> : <Crown size={14} fill="currentColor" />}
                </div>
            </div>
            
            <div className="flex flex-col items-center">
                 <span className="text-sm text-gray-500">点击更换队徽</span>
                 {!isVip && <span className="text-[10px] text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded mt-1 font-medium border border-yellow-100">VIP 专属</span>}
            </div>
            
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
            />
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-xl overflow-hidden px-4">
            <div className="py-4 border-b border-gray-100">
                <label className="text-xs text-gray-500 mb-1 block">球队名称</label>
                <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full text-base font-medium outline-none placeholder-gray-300"
                    placeholder="请输入球队名称"
                />
            </div>
             <div className="py-4 border-b border-gray-100">
                <label className="text-xs text-gray-500 mb-2 block">球队性质</label>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setFormData({...formData, gender: 'male'})}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${formData.gender === 'male' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-600'}`}
                    >
                        男足
                    </button>
                    <button 
                         onClick={() => setFormData({...formData, gender: 'female'})}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${formData.gender === 'female' ? 'bg-pink-500 text-white shadow-md shadow-pink-200' : 'bg-gray-100 text-gray-600'}`}
                    >
                        女足
                    </button>
                </div>
            </div>
            <div className="py-4">
                <label className="text-xs text-gray-500 mb-1 block">球队公告</label>
                <textarea 
                    value={formData.announcement}
                    onChange={(e) => setFormData({...formData, announcement: e.target.value})}
                    className="w-full h-24 text-base outline-none resize-none placeholder-gray-300"
                    placeholder="发布最新通知，例如固定活动时间、招新要求等..."
                ></textarea>
            </div>
        </div>

        {/* Jersey Colors */}
        <div className="bg-white rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <Shirt size={18} className="text-gray-400" />
                <span className="font-bold text-gray-800">球衣颜色设置</span>
            </div>
            
            <div className="space-y-6">
                {/* Home */}
                <div>
                    <div className="flex justify-between mb-3">
                        <span className="text-sm text-gray-600">主场球衣 <span className="text-xs text-gray-400">(默认)</span></span>
                        <div className="w-4 h-4 rounded-full border border-gray-200" style={{backgroundColor: formData.homeJerseyColor}}></div>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                        {jerseyColors.map(color => (
                            <button
                                key={color.hex}
                                onClick={() => setFormData({...formData, homeJerseyColor: color.hex})}
                                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${formData.homeJerseyColor === color.hex ? 'border-gray-800 scale-110 ring-2 ring-gray-100' : 'border-transparent'}`}
                            >
                                <div className="w-7 h-7 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color.hex }}></div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Away */}
                <div>
                     <div className="flex justify-between mb-3">
                        <span className="text-sm text-gray-600">客场球衣</span>
                        <div className="w-4 h-4 rounded-full border border-gray-200" style={{backgroundColor: formData.awayJerseyColor}}></div>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                        {jerseyColors.map(color => (
                            <button
                                key={color.hex}
                                onClick={() => setFormData({...formData, awayJerseyColor: color.hex})}
                                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${formData.awayJerseyColor === color.hex ? 'border-gray-800 scale-110 ring-2 ring-gray-100' : 'border-transparent'}`}
                            >
                                <div className="w-7 h-7 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color.hex }}></div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Save Button */}
        <button 
            onClick={handleSave}
            className="w-full bg-[#07c160] active:bg-[#06ad56] text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-100 transition-transform active:scale-[0.99] mt-4"
        >
            保存设置
        </button>

      </div>
    </div>
  );
};

export default TeamSettings;