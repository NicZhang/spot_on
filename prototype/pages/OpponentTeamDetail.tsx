import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import NavBar from '../components/NavBar';
import { ShieldCheck, MapPin, Users, Trophy, AlertTriangle, Star, History, Lock } from 'lucide-react';
import VipOverlay from '../components/VipOverlay';

const OpponentTeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { matches, role, toggleVip } = useApp();
  const isVip = role === UserRole.VIP_CAPTAIN;

  // Find team from matches (mock data source)
  const match = matches.find(m => m.hostTeam.id === id);
  const team = match?.hostTeam;

  if (!team) {
    return <div className="p-4">Team not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <NavBar title="对手详情" showBack />

      {/* Header Card */}
      <div className="bg-white p-6 mb-2">
        <div className="flex items-center gap-4 mb-4">
          <img src={team.logo} alt={team.name} className="w-20 h-20 rounded-xl bg-gray-200 object-cover" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {team.name}
              {team.isVerified && <ShieldCheck size={18} className="text-blue-500" />}
            </h1>
            <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
              <MapPin size={14} />
              <span>{team.location}</span>
            </div>
            <div className="flex gap-2 mt-2">
               <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">平均年龄 {team.avgAge}岁</span>
               <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{team.gender === 'male' ? '男足' : '女足'}</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
            <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">信用分</div>
                <div className={`text-xl font-bold ${team.creditScore >= 90 ? 'text-[#07c160]' : team.creditScore < 60 ? 'text-red-500' : 'text-yellow-600'}`}>
                    {isVip ? team.creditScore : '***'}
                </div>
            </div>
            <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">胜率</div>
                <div className="text-xl font-bold text-gray-900">
                    {isVip ? `${team.winRate}%` : '***'}
                </div>
            </div>
            <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">爽约率</div>
                <div className="text-xl font-bold text-gray-900">
                    {isVip ? '0%' : '***'}
                </div>
            </div>
        </div>
        
        {!isVip && (
            <div 
                onClick={() => navigate('/vip-subscribe')}
                className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
            >
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 text-white p-1 rounded-full">
                        <Lock size={12} />
                    </div>
                    <div className="text-xs text-blue-800">
                        <span className="font-bold">解锁全景数据</span>
                        <div className="opacity-70">查看详细战绩、信用明细、评价标签</div>
                    </div>
                </div>
                <div className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-full font-medium">
                    立即开通
                </div>
            </div>
        )}
      </div>

      {/* Recent Results (VIP Only) */}
      <div className="bg-white p-4 mb-2 relative overflow-hidden">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            近期战绩 (近10场)
        </h3>
        
        <div className={`space-y-3 ${!isVip ? 'blur-sm select-none opacity-50' : ''}`}>
            {team.recentResults?.map((res, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                    <div className="flex items-center gap-2 w-1/3">
                        <span className={`w-5 h-5 flex items-center justify-center rounded text-xs text-white ${res.result === 'win' ? 'bg-red-500' : res.result === 'draw' ? 'bg-gray-400' : 'bg-green-600'}`}>
                            {res.result === 'win' ? '胜' : res.result === 'draw' ? '平' : '负'}
                        </span>
                        <span className="text-gray-500 text-xs">{res.date}</span>
                    </div>
                    <div className="font-bold font-mono text-gray-900">{res.score}</div>
                    <div className="text-right text-gray-600 w-1/3 truncate">
                        vs {res.opponentName}
                    </div>
                </div>
            )) || <div className="text-gray-400 text-sm text-center py-4">暂无战绩记录</div>}
        </div>
        
        {!isVip && <VipOverlay label="VIP可见详细战绩" />}
      </div>

      {/* Credit History (VIP Only) */}
      <div className="bg-white p-4 mb-2 relative overflow-hidden">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <History size={18} className="text-blue-500" />
            信用档案
        </h3>
        
        <div className={`space-y-3 ${!isVip ? 'blur-sm select-none opacity-50' : ''}`}>
             {team.creditHistory?.map((item, idx) => (
                 <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0">
                     <div>
                         <div className="text-gray-800">{item.reason}</div>
                         <div className="text-xs text-gray-400">{item.date}</div>
                     </div>
                     <div className={`font-bold ${item.change > 0 ? 'text-[#07c160]' : 'text-red-500'}`}>
                         {item.change > 0 ? '+' : ''}{item.change}
                     </div>
                 </div>
             )) || <div className="text-gray-400 text-sm text-center py-4">暂无信用记录</div>}
        </div>
        
        {!isVip && <VipOverlay label="VIP可见信用明细" />}
      </div>

      {/* Tags (VIP Only) */}
      <div className="bg-white p-4 mb-2 relative overflow-hidden">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Star size={18} className="text-purple-500" />
            互评标签
        </h3>
        
        <div className={`flex flex-wrap gap-2 ${!isVip ? 'blur-sm select-none opacity-50' : ''}`}>
            {team.tags.map((tag, idx) => (
                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                    {tag}
                </span>
            ))}
        </div>
        
        {!isVip && <VipOverlay label="VIP可见互评标签" />}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-20 max-w-md mx-auto">
          <button className="w-full bg-[#07c160] text-white font-bold py-3 rounded-xl shadow-lg active:scale-[0.98] transition-transform">
              发起约战邀请
          </button>
      </div>
    </div>
  );
};

export default OpponentTeamDetail;
