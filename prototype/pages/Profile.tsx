import React from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import NavBar from '../components/NavBar';
import { Crown, ShieldCheck, ChevronRight, Users, Trophy, Settings, Star, Zap, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { role, players, myTeam, mySchedule } = useApp();
  const navigate = useNavigate();
  const me = players[0]; // Assuming first player is me
  const isVip = role === UserRole.VIP_CAPTAIN;

  // Calculate matches played
  const matchesPlayed = mySchedule.filter(m => m.status === 'finished').length;

  // Recent activities (derived from schedule)
  const recentActivities = [
    ...mySchedule
      .filter(m => m.status === 'finished')
      .slice(0, 2)
      .map(m => ({
        icon: Trophy,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        text: `完成比赛 vs ${m.opponentName}`,
        sub: `${m.myScore}:${m.opponentScore} ${m.date}`,
      })),
    {
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      text: `加入球队 ${myTeam.name}`,
      sub: '2025-01-15',
    },
  ].slice(0, 3);

  // Quick actions
  const quickActions = [
    { icon: Users, label: '我的球队', color: 'bg-blue-500', route: '/my-team' },
    { icon: Trophy, label: '比赛记录', color: 'bg-amber-500', route: '/matches' },
    { icon: ShieldCheck, label: '球队认证', color: 'bg-emerald-500', route: '/team/verification' },
    { icon: Crown, label: 'VIP订阅', color: 'bg-purple-500', route: '/vip-subscribe' },
  ];

  // Menu items with colored icon backgrounds
  const menuItems = [
    { icon: Users, label: '我的球队', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', route: '/my-team' },
    { icon: ShieldCheck, label: '球队认证', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', value: myTeam.isVerified ? '已认证' : '未认证', route: '/team/verification' },
    { icon: Trophy, label: '我的比赛', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', route: '/matches' },
    { icon: Settings, label: '设置', iconBg: 'bg-gray-100', iconColor: 'text-gray-600', route: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <NavBar title="个人中心" />

      {/* Header with gradient banner */}
      <div className="relative">
        {/* Banner gradient */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-[#07c160] via-[#07c160]/80 to-emerald-400" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/10 to-transparent" />

        <div className="relative pt-6 pb-4 px-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={me.avatar}
                className="w-18 h-18 rounded-full bg-gray-200 border-[3px] border-white shadow-lg"
                style={{ width: 72, height: 72 }}
                alt="avatar"
              />
              {isVip && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                  <Crown size={12} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 drop-shadow-sm">
                {me.name}
                {isVip ? (
                  <span className="text-[10px] bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-2 py-0.5 rounded-full font-bold">VIP</span>
                ) : (
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-white/90 font-medium backdrop-blur-sm">普通队长</span>
                )}
              </h2>
              <div className="text-sm text-white/80 mt-0.5">ID: 9527 &bull; {myTeam.name}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - 5 columns scrollable */}
      <div className="bg-white mx-4 -mt-1 rounded-xl shadow-sm overflow-hidden mb-3">
        <div className="overflow-x-auto no-scrollbar">
          <div className="grid grid-cols-5 min-w-[360px] p-4 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{me.goals}</div>
              <div className="text-[11px] text-gray-400">进球</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{me.assists}</div>
              <div className="text-[11px] text-gray-400">助攻</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{me.mvpCount}</div>
              <div className="text-[11px] text-gray-400">MVP</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">{matchesPlayed}</div>
              <div className="text-[11px] text-gray-400">出场</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[#07c160]">&yen;{me.balance}</div>
              <div className="text-[11px] text-gray-400">余额</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="px-4 mb-3">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.route)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform"
            >
              <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center shadow-sm`}>
                <action.icon size={22} className="text-white" />
              </div>
              <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* VIP Banner with shimmer effect */}
      <div className="px-4 mb-3">
        <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl p-4 text-white flex justify-between items-center shadow-lg relative overflow-hidden">
          {/* Animated shimmer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute inset-0 -translate-x-full"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            />
          </div>
          <div className="absolute right-0 top-0 opacity-10">
            <Crown size={120} />
          </div>
          <div className="z-10">
            <div className="font-bold text-lg text-yellow-400 flex items-center gap-2">
              <Crown size={20} /> Spot On VIP
            </div>
            <div className="text-xs text-gray-300 mt-1">解锁对手透视镜、智能催收、酷炫战报</div>
          </div>
          <button
            onClick={() => navigate('/vip-subscribe')}
            className={`${
              isVip ? 'bg-white/20 text-white' : 'bg-yellow-400 text-black'
            } px-4 py-2 rounded-full text-xs font-bold z-10 transition-colors active:scale-95`}
          >
            {isVip ? '管理订阅' : '立即开通'}
          </button>
        </div>
      </div>

      {/* Recent Activity Section */}
      {recentActivities.length > 0 && (
        <div className="bg-white mx-4 rounded-xl shadow-sm mb-3 overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800">最近动态</span>
            <span className="text-[11px] text-gray-400">查看全部</span>
          </div>
          <div className="px-4 pb-3 space-y-3">
            {recentActivities.map((activity, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className={`w-8 h-8 ${activity.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <activity.icon size={16} className={activity.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 truncate">{activity.text}</div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock size={10} /> {activity.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu List */}
      <div className="bg-white mx-4 rounded-xl shadow-sm overflow-hidden mb-4">
        {menuItems.map((item, index) => (
          <div
            key={item.label}
            onClick={() => navigate(item.route)}
            className={`flex items-center justify-between p-4 active:bg-gray-50 cursor-pointer ${
              index < menuItems.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${item.iconBg} rounded-lg flex items-center justify-center`}>
                <item.icon size={18} className={item.iconColor} />
              </div>
              <span className="text-sm font-medium text-gray-800">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.value && <span className="text-xs text-gray-400">{item.value}</span>}
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-xs text-gray-300 mt-4 pb-2">
        Version 1.0.0
      </div>

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default Profile;
