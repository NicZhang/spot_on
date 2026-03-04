import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Users, ShieldCheck, Trophy, MapPin } from 'lucide-react';

const InviteLanding: React.FC = () => {
  const { myTeam, addPlayer } = useApp();
  const navigate = useNavigate();
  const [isJoined, setIsJoined] = useState(false);

  const handleJoin = () => {
      // Simulate login and join
      setTimeout(() => {
          addPlayer(); // Adds a mock player
          setIsJoined(true);
          setTimeout(() => {
              navigate('/my-team');
          }, 1500);
      }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#07c160] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:20px_20px]"></div>
      
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-slide-up">
          {/* Header */}
          <div className="bg-gray-900 p-6 text-center relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
              <div className="text-white/60 text-xs tracking-widest uppercase mb-2">Team Invitation</div>
              <h1 className="text-2xl font-bold text-white">球队邀请函</h1>
          </div>

          {/* Body */}
          <div className="p-8 flex flex-col items-center">
              {/* Captain Info */}
              <div className="flex flex-col items-center -mt-12 mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gray-200">
                      <img src="https://picsum.photos/seed/captain/200" className="w-full h-full rounded-full object-cover" alt="Captain" />
                  </div>
                  <div className="mt-2 text-center">
                      <div className="text-sm text-gray-500">队长</div>
                      <div className="font-bold text-gray-900">王大雷</div>
                  </div>
              </div>

              <div className="text-gray-500 text-sm mb-6 text-center">
                  邀请你加入
              </div>

              {/* Team Card */}
              <div className="bg-gray-50 rounded-2xl p-6 w-full border border-gray-100 mb-8 text-center">
                  <img src={myTeam.logo} className="w-24 h-24 rounded-full bg-white shadow-md mx-auto mb-4 object-cover" alt="Team" />
                  <h2 className="text-xl font-black text-gray-900 mb-1">{myTeam.name}</h2>
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-4">
                      <MapPin size={12} /> {myTeam.location}
                  </div>

                  <div className="flex justify-center gap-4 border-t border-gray-200 pt-4">
                      <div className="text-center">
                          <div className="font-bold text-gray-900">{myTeam.winRate}%</div>
                          <div className="text-[10px] text-gray-400">胜率</div>
                      </div>
                      <div className="w-[1px] h-8 bg-gray-200"></div>
                      <div className="text-center">
                          <div className="font-bold text-gray-900">{myTeam.creditScore}</div>
                          <div className="text-[10px] text-gray-400">信用分</div>
                      </div>
                      <div className="w-[1px] h-8 bg-gray-200"></div>
                      <div className="text-center">
                          <div className="font-bold text-gray-900">Lv.4</div>
                          <div className="text-[10px] text-gray-400">等级</div>
                      </div>
                  </div>
              </div>

              {/* Action */}
              {isJoined ? (
                  <button className="w-full bg-gray-100 text-[#07c160] font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-default">
                      <CheckCircle2 size={20} />
                      已加入球队
                  </button>
              ) : (
                  <button 
                    onClick={handleJoin}
                    className="w-full bg-[#07c160] text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                  >
                      <Users size={20} />
                      接受邀请并加入
                  </button>
              )}
              
              <p className="text-xs text-gray-400 mt-4 text-center">
                  点击即代表同意《用户协议》和《隐私政策》
              </p>
          </div>
      </div>
    </div>
  );
};

// Helper icon
const CheckCircle2 = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
        <path d="m9 12 2 2 4-4"></path>
    </svg>
);

export default InviteLanding;
