import React from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import NavBar from '../components/NavBar';
import { Crown, ShieldCheck, ChevronRight, Users, Trophy, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { role, players, myTeam } = useApp();
  const navigate = useNavigate();
  const me = players[0]; // Assuming first player is me
  const isVip = role === UserRole.VIP_CAPTAIN;

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <NavBar title="个人中心" />

      {/* Header */}
      <div className="bg-white p-6 mb-2 flex items-center gap-4">
        <img src={me.avatar} className="w-16 h-16 rounded-full bg-gray-200" alt="avatar" />
        <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {me.name}
                {isVip ? <Crown size={18} className="text-yellow-500 fill-yellow-500" /> : <span className="text-xs bg-gray-200 px-2 rounded text-gray-500">普通队长</span>}
            </h2>
            <div className="text-sm text-gray-500 mt-1">ID: 9527 • {myTeam.name}</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="bg-white p-4 mb-2 grid grid-cols-4 gap-2">
         <div className="text-center">
             <div className="text-lg font-bold text-gray-800">{me.goals}</div>
             <div className="text-xs text-gray-500">进球</div>
         </div>
         <div className="text-center">
             <div className="text-lg font-bold text-gray-800">{me.assists}</div>
             <div className="text-xs text-gray-500">助攻</div>
         </div>
         <div className="text-center">
             <div className="text-lg font-bold text-gray-800">{me.mvpCount}</div>
             <div className="text-xs text-gray-500">MVP</div>
         </div>
         <div className="text-center">
             <div className="text-lg font-bold text-gray-800">¥{me.balance}</div>
             <div className="text-xs text-gray-500">余额</div>
         </div>
      </div>

      {/* VIP Banner */}
      <div className="px-4 mb-4">
          <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl p-4 text-white flex justify-between items-center shadow-lg relative overflow-hidden">
               <div className="absolute right-0 top-0 opacity-10">
                   <Crown size={120} />
               </div>
               <div>
                   <div className="font-bold text-lg text-yellow-400 flex items-center gap-2">
                       <Crown size={20} /> Spot On VIP
                   </div>
                   <div className="text-xs text-gray-300 mt-1">解锁对手透视镜、智能催收、酷炫战报</div>
               </div>
               <button 
                  onClick={() => navigate('/vip-subscribe')}
                  className={`${isVip ? 'bg-white/20 text-white' : 'bg-yellow-400 text-black'} px-4 py-2 rounded-full text-xs font-bold z-10 transition-colors`}
               >
                   {isVip ? '管理订阅' : '立即开通'}
               </button>
          </div>
      </div>

      {/* Menu List */}
      <div className="bg-white">
          <MenuItem icon={Users} label="我的球队" onClick={() => navigate('/my-team')} />
          <MenuItem 
            icon={ShieldCheck} 
            label="球队认证" 
            value={myTeam.isVerified ? "已认证" : "未认证"} 
            onClick={() => navigate('/team/verification')}
          />
          <MenuItem icon={Trophy} label="我的比赛" onClick={() => navigate('/matches')} />
          <MenuItem icon={Settings} label="设置" onClick={() => navigate('/settings')} />
      </div>
      
      <div className="text-center text-xs text-gray-300 mt-8">
          Version 1.0.0
      </div>
    </div>
  );
};

const MenuItem: React.FC<{ icon: any, label: string, value?: string, onClick?: () => void }> = ({ icon: Icon, label, value, onClick }) => (
    <div 
        onClick={onClick}
        className="flex items-center justify-between p-4 active:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
    >
        <div className="flex items-center gap-3">
            <Icon size={20} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-800">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className="text-xs text-gray-400">{value}</span>}
            <ChevronRight size={16} className="text-gray-300" />
        </div>
    </div>
);

export default Profile;