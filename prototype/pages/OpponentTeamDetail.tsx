import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import NavBar from '../components/NavBar';
import { ShieldCheck, MapPin, Users, Trophy, Star, History, Lock, MessageCircle, Flag, X, Check, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import VipOverlay from '../components/VipOverlay';

const OpponentTeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { opponents, matches, role, createChat } = useApp();
  const isVip = role === UserRole.VIP_CAPTAIN;

  const [showReportMenu, setShowReportMenu] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);

  // Find team from opponents list first, then fall back to matches
  const team = opponents.find(t => t.id === id) || matches.find(m => m.hostTeam.id === id)?.hostTeam;

  if (!team) {
    return <div className="p-4">Team not found</div>;
  }

  const handleReport = (reason: string) => {
    setShowReportMenu(false);
    setReportSubmitted(true);
    setTimeout(() => setReportSubmitted(false), 3000);
  };

  const handleStartChat = () => {
    const chatId = createChat(team.id, `${team.name}队长`, team.logo);
    setChatStarted(true);
    setTimeout(() => {
      navigate(`/chat/${chatId}`);
    }, 600);
  };

  // Calculate W/D/L record
  const wins = team.recentResults?.filter(r => r.result === 'win').length ?? 0;
  const draws = team.recentResults?.filter(r => r.result === 'draw').length ?? 0;
  const losses = team.recentResults?.filter(r => r.result === 'loss').length ?? 0;
  const totalMatches = (team.recentResults?.length ?? 0);

  // Credit score color
  const creditColor = team.creditScore >= 90 ? 'text-[#07c160]' : team.creditScore >= 60 ? 'text-yellow-600' : 'text-red-500';
  const creditBgColor = team.creditScore >= 90 ? 'bg-[#07c160]/10' : team.creditScore >= 60 ? 'bg-yellow-50' : 'bg-red-50';
  const creditLabel = team.creditScore >= 90 ? '优秀' : team.creditScore >= 60 ? '一般' : '较差';

  return (
    <div className="min-h-screen bg-gray-100 pb-32">
      <NavBar
        title="对手详情"
        showBack
        rightActions={[
          {
            icon: <Flag size={18} />,
            onClick: () => setShowReportMenu(true),
            ariaLabel: '举报',
          },
        ]}
      />

      {/* Report Submitted Toast */}
      {reportSubmitted && (
        <div className="fixed top-16 left-0 right-0 z-[100] max-w-md mx-auto animate-in slide-in-from-top duration-200">
          <div className="mx-4 bg-[#07c160] text-white rounded-xl p-3 shadow-lg flex items-center gap-2 text-sm">
            <Check size={16} />
            <span>举报已提交，平台将在24小时内处理</span>
          </div>
        </div>
      )}

      {/* Report Menu Sheet */}
      {showReportMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
            onClick={() => setShowReportMenu(false)}
          ></div>
          <div className="relative bg-white w-full max-w-md rounded-t-2xl animate-in slide-in-from-bottom duration-300 z-10">
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900">举报球队</h3>
                <button onClick={() => setShowReportMenu(false)} className="p-1 text-gray-400">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-2">
              {['虚假信息', '恶意爽约', '比赛中暴力行为', '虚报信用分', '其他'].map(reason => (
                <button
                  key={reason}
                  onClick={() => handleReport(reason)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 active:bg-gray-50 rounded-lg"
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setShowReportMenu(false)}
                className="w-full py-3 text-center text-gray-500 font-medium rounded-xl bg-gray-50 active:bg-gray-100"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white p-6 mb-2">
        <div className="flex items-center gap-4 mb-4">
          <img src={team.logo} alt={team.name} className="w-20 h-20 rounded-xl bg-gray-200 object-cover shadow-sm" />
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

        {/* Stats Grid - Improved Layout */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {/* Credit Score */}
          <div className={`${creditBgColor} rounded-xl p-3 text-center`}>
            <div className="text-xs text-gray-500 mb-1">信用分</div>
            {isVip ? (
              <>
                <div className={`text-2xl font-black ${creditColor}`}>{team.creditScore}</div>
                <div className={`text-[10px] font-medium mt-0.5 ${creditColor}`}>{creditLabel}</div>
              </>
            ) : (
              <div className="text-xl font-bold text-gray-300">***</div>
            )}
          </div>

          {/* Win Rate */}
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">胜率</div>
            {isVip ? (
              <>
                <div className="text-2xl font-black text-blue-600">{team.winRate}%</div>
                <div className="flex items-center justify-center gap-0.5 text-[10px] text-blue-500 mt-0.5">
                  {team.winRate >= 50 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {totalMatches}场
                </div>
              </>
            ) : (
              <div className="text-xl font-bold text-gray-300">***</div>
            )}
          </div>

          {/* W/D/L Record */}
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">近期战绩</div>
            {isVip ? (
              <>
                <div className="text-lg font-black text-purple-600">
                  <span className="text-[#07c160]">{wins}</span>
                  <span className="text-gray-400 mx-0.5">/</span>
                  <span>{draws}</span>
                  <span className="text-gray-400 mx-0.5">/</span>
                  <span className="text-red-500">{losses}</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">胜/平/负</div>
              </>
            ) : (
              <div className="text-xl font-bold text-gray-300">***</div>
            )}
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

        {/* Result Streak Mini-Viz */}
        {isVip && team.recentResults && team.recentResults.length > 0 && (
          <div className="flex gap-1.5 mb-4">
            {team.recentResults.map((res, idx) => (
              <div
                key={idx}
                className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] text-white font-bold ${
                  res.result === 'win' ? 'bg-red-500' : res.result === 'draw' ? 'bg-gray-400' : 'bg-green-600'
                }`}
              >
                {res.result === 'win' ? '胜' : res.result === 'draw' ? '平' : '负'}
              </div>
            ))}
          </div>
        )}

        <div className={`space-y-3 ${!isVip ? 'blur-sm select-none opacity-50' : ''}`}>
          {team.recentResults?.map((res, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
              <div className="flex items-center gap-2 w-1/3">
                <span
                  className={`w-5 h-5 flex items-center justify-center rounded text-xs text-white ${
                    res.result === 'win' ? 'bg-red-500' : res.result === 'draw' ? 'bg-gray-400' : 'bg-green-600'
                  }`}
                >
                  {res.result === 'win' ? '胜' : res.result === 'draw' ? '平' : '负'}
                </span>
                <span className="text-gray-500 text-xs">{res.date}</span>
              </div>
              <div className="font-bold font-mono text-gray-900">{res.score}</div>
              <div className="text-right text-gray-600 w-1/3 truncate">vs {res.opponentName}</div>
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
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.change > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  {item.change > 0 ? (
                    <TrendingUp size={14} className="text-[#07c160]" />
                  ) : (
                    <AlertTriangle size={14} className="text-red-500" />
                  )}
                </div>
                <div>
                  <div className="text-gray-800 font-medium">{item.reason}</div>
                  <div className="text-xs text-gray-400">{item.date}</div>
                </div>
              </div>
              <div className={`font-bold text-lg ${item.change > 0 ? 'text-[#07c160]' : 'text-red-500'}`}>
                {item.change > 0 ? '+' : ''}
                {item.change}
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

      {/* Bottom Action - Two Buttons: Chat + Challenge */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-20 max-w-md mx-auto">
        <div className="flex gap-3">
          <button
            onClick={handleStartChat}
            disabled={chatStarted}
            className="flex-1 bg-blue-50 text-blue-600 font-bold py-3 rounded-xl border border-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {chatStarted ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                跳转中...
              </>
            ) : (
              <>
                <MessageCircle size={18} />
                发起聊天
              </>
            )}
          </button>
          <button className="flex-1 bg-[#07c160] text-white font-bold py-3 rounded-xl shadow-lg active:scale-[0.98] transition-transform">
            发起约战邀请
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpponentTeamDetail;
