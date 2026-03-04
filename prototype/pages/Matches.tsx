import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import NavBar from '../components/NavBar';
import { Share2, Award, Download, Calendar, MapPin, Clock, Edit3, ChevronRight, X, Lock, Trophy } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const Matches: React.FC = () => {
  const { mySchedule, myTeam, players, role, confirmMatchResult } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showReport, setShowReport] = useState<string | null>(null);
  const isVip = role === UserRole.VIP_CAPTAIN;
  
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');
  const [activeTemplate, setActiveTemplate] = useState<'classic' | 'ucl' | 'cyber'>('classic');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto open report if query param exists
  useEffect(() => {
      const reportId = searchParams.get('report');
      if (reportId) {
          setShowReport(reportId);
      }
  }, [searchParams]);

  // Scroll to active template when modal opens
  useEffect(() => {
      if (showReport && scrollContainerRef.current) {
          const index = ['classic', 'ucl', 'cyber'].indexOf(activeTemplate);
          if (index !== -1) {
              const container = scrollContainerRef.current;
              const cardWidth = container.children[0]?.clientWidth || 0;
              const gap = 24; // gap-6 = 24px
              // Center the card
              // padding-left is 32px (px-8)
              // We want: scrollLeft = (cardWidth + gap) * index
              // But snap-center handles centering mostly.
              // Let's try simple scroll
              setTimeout(() => {
                  if (container.children[index]) {
                      container.children[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }
              }, 100);
          }
      }
  }, [showReport]);

  const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const center = container.scrollLeft + container.clientWidth / 2;
      
      // Find which child is closest to center
      const cards = Array.from(container.children) as HTMLElement[];
      let closestIndex = 0;
      let minDistance = Infinity;

      cards.forEach((card, index) => {
          const cardCenter = card.offsetLeft + card.clientWidth / 2;
          const distance = Math.abs(center - cardCenter);
          if (distance < minDistance) {
              minDistance = distance;
              closestIndex = index;
          }
      });

      const templates = ['classic', 'ucl', 'cyber'] as const;
      if (templates[closestIndex]) {
          setActiveTemplate(templates[closestIndex]);
      }
  };

  const handleGenerateReport = (id: string) => {
    setShowReport(id);
    setActiveTemplate(isVip ? 'ucl' : 'classic'); // Default to UCL if VIP, otherwise Classic
  };

  const handleTemplateChange = (tpl: 'classic' | 'ucl' | 'cyber') => {
      if (!isVip && tpl !== 'classic') {
          navigate('/vip-subscribe');
          return;
      }
      setActiveTemplate(tpl);
  };

  const handleConfirmMatch = (id: string) => {
      if(confirm("模拟：对手已确认比分无误？\n(确认后将生成账单并更新胜率)")) {
          confirmMatchResult(id);
      }
  };

  const selectedMatch = mySchedule.find(h => h.id === showReport);

  // Filter lists
  const upcomingMatches = mySchedule.filter(m => m.status === 'upcoming' || m.status === 'pending_report' || m.status === 'waiting_confirmation' || m.status === 'confirm_needed');
  const finishedMatches = mySchedule.filter(m => m.status === 'finished');

  // Helper to get player name
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || '未知球员';
  const getPlayerAvatar = (id: string) => players.find(p => p.id === id)?.avatar || '';

  // Template Styles
  const templates = {
      classic: {
          bg: "bg-white",
          text: "text-gray-900",
          accent: "text-[#07c160]",
          border: "border-gray-100",
          subText: "text-gray-500",
          cardBg: "bg-gray-50",
          font: "font-sans"
      },
      ucl: {
          bg: "bg-gradient-to-br from-[#0e1e5b] to-[#040a24]",
          text: "text-white",
          accent: "text-[#d4af37]", // Gold
          border: "border-white/10",
          subText: "text-blue-200",
          cardBg: "bg-white/10 backdrop-blur-md",
          font: "font-serif"
      },
      cyber: {
          bg: "bg-black",
          text: "text-white",
          accent: "text-[#00ff9d]", // Neon Green
          border: "border-[#00ff9d]/30",
          subText: "text-gray-400",
          cardBg: "bg-gray-900/80 border border-[#00ff9d]/20",
          font: "font-mono"
      }
  };

  const currentStyle = templates[activeTemplate];

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <NavBar title="比赛记录" showBack={true} />
      
      {/* Tabs */}
      <div className="bg-white px-4 pt-2 pb-0 flex border-b border-gray-200 sticky top-12 z-20">
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'schedule' ? 'border-[#07c160] text-[#07c160]' : 'border-transparent text-gray-500'}`}
          >
              赛程 ({upcomingMatches.length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-[#07c160] text-[#07c160]' : 'border-transparent text-gray-500'}`}
          >
              历史战绩 ({finishedMatches.length})
          </button>
      </div>
      
      <div className="p-4 space-y-4">
        {activeTab === 'schedule' ? (
            <div className="space-y-4">
                {upcomingMatches.length === 0 && <div className="text-center text-gray-400 py-10">暂无待踢比赛</div>}
                
                {upcomingMatches.map(match => (
                    <div key={match.id} className={`bg-white rounded-xl shadow-sm overflow-hidden border-l-4 ${match.status === 'waiting_confirmation' ? 'border-amber-500' : match.status === 'confirm_needed' ? 'border-blue-500' : 'border-[#07c160]'}`}>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2 text-[#07c160] font-bold text-sm bg-[#07c160]/10 px-2 py-1 rounded">
                                    <Calendar size={14} /> {match.date}
                                </div>
                                {match.status === 'pending_report' && (
                                    <span className="text-xs bg-red-100 text-red-500 px-2 py-1 rounded font-bold animate-pulse">
                                        待录入比分
                                    </span>
                                )}
                                {match.status === 'waiting_confirmation' && (
                                    <span className="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded font-bold flex items-center gap-1">
                                        <Clock size={12} /> 等待对手确认
                                    </span>
                                )}
                                {match.status === 'confirm_needed' && (
                                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold flex items-center gap-1">
                                        <Clock size={12} /> 待我方确认
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <img src={match.opponentLogo} className="w-12 h-12 rounded-full bg-gray-200 object-cover" alt="opp" />
                                    <div>
                                        <div className="font-bold text-gray-900 text-lg">{match.opponentName}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <MapPin size={12} /> {match.location}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-400 mb-1">{match.format}</div>
                                    {match.status === 'waiting_confirmation' || match.status === 'confirm_needed' ? (
                                        <div className="text-xl font-black font-mono">{match.myScore}:{match.opponentScore}</div>
                                    ) : (
                                        <div className="text-sm font-medium text-gray-600">VS</div>
                                    )}
                                </div>
                            </div>

                            {match.status === 'pending_report' && (
                                <button 
                                    onClick={() => navigate(`/match/${match.id}/edit`)}
                                    className="w-full bg-red-500 text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    <Edit3 size={16} /> 录入比分 & 生成账单
                                </button>
                            )}
                            
                            {match.status === 'confirm_needed' && (
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <div className="text-xs text-blue-700 mb-2">
                                        对手已提交比分 <span className="font-bold">{match.myScore}:{match.opponentScore}</span>，请核对。
                                        <br/>
                                        <span className="opacity-70">确认无误后，请补充出勤名单以生成账单。</span>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/match/${match.id}/edit`)}
                                        className="w-full bg-blue-600 text-white py-2 rounded font-bold text-xs shadow-sm active:scale-95"
                                    >
                                        核对数据 & 生成账单
                                    </button>
                                </div>
                            )}

                            {match.status === 'waiting_confirmation' && (
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                    <div className="text-xs text-amber-700 mb-2">
                                        已提交比分 {match.myScore}:{match.opponentScore}，等待 {match.opponentName} 确认中...
                                        <br/>
                                        <span className="opacity-70">确认后将自动更新胜率和信用分</span>
                                    </div>
                                    <button 
                                        onClick={() => handleConfirmMatch(match.id)}
                                        className="w-full bg-amber-200 text-amber-800 py-2 rounded font-bold text-xs"
                                    >
                                        [模拟] 对手确认比分
                                    </button>
                                </div>
                            )}

                            {match.status === 'upcoming' && (
                                <div className="flex gap-2">
                                    <button className="flex-1 bg-gray-100 text-gray-400 py-2 rounded-lg text-sm font-medium cursor-not-allowed">
                                        未开始
                                    </button>
                                    <button className="flex-1 bg-[#07c160]/10 text-[#07c160] py-2 rounded-lg text-sm font-medium">
                                        签到
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="space-y-4">
                {finishedMatches.map(match => (
                <div key={match.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {/* Scoreboard */}
                    <div className="bg-[#1b2838] p-6 text-white text-center relative">
                        <div className="text-xs text-gray-400 mb-4">{match.date} • {match.format}</div>
                        <div className="flex justify-between items-center px-4">
                            <div className="flex flex-col items-center w-1/3">
                                <img src={myTeam.logo} className="w-12 h-12 rounded-full border-2 border-white mb-2" alt="myteam" />
                                <span className="text-sm font-bold truncate w-full text-center">{myTeam.name}</span>
                            </div>
                            <div className="text-4xl font-black font-mono tracking-widest">{match.myScore}:{match.opponentScore}</div>
                            <div className="flex flex-col items-center w-1/3">
                                <img src={match.opponentLogo} className="w-12 h-12 rounded-full border-2 border-gray-600 bg-gray-700 mb-2 object-cover" alt="opp" />
                                <span className="text-sm font-bold truncate w-full text-center">{match.opponentName}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Stats Preview */}
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Award size={16} className="text-yellow-500" />
                            <span className="text-sm font-bold text-gray-700">本场 MVP:</span>
                            <span className="text-sm text-gray-900">{players.find(p => p.id === match.mvpPlayerId)?.name || '未评选'}</span>
                        </div>
                        
                        <div className="border-t border-gray-100 pt-3 flex justify-end gap-3">
                             <button 
                                onClick={() => navigate(`/match/${match.id}/edit`)}
                                className="text-gray-400 text-sm px-3 py-2 flex items-center gap-1"
                             >
                                <Edit3 size={14} /> 修改
                             </button>
                            <button 
                                onClick={() => handleGenerateReport(match.id)}
                                className="bg-gray-900 text-white text-sm px-4 py-2 rounded-full flex items-center gap-2 active:scale-95 transition-transform"
                            >
                                <Share2 size={14} /> 查看战报
                            </button>
                        </div>
                    </div>
                </div>
                ))}
            </div>
        )}
      </div>

      {/* Report Modal */}
      {showReport && selectedMatch && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-full flex flex-col items-center justify-center p-4 py-12 relative">
                
                {/* Close Button */}
                <button 
                    onClick={() => setShowReport(null)}
                    className="absolute top-4 right-4 text-white/50 hover:text-white p-2 bg-white/10 rounded-full transition-colors z-50"
                >
                    <X size={24} />
                </button>

                {/* Carousel Container */}
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 w-full flex overflow-x-auto snap-x snap-mandatory gap-6 px-8 items-center no-scrollbar py-10"
                >
                    {(['classic', 'ucl', 'cyber'] as const).map((tpl) => {
                        const style = templates[tpl];
                        const isLocked = !isVip && tpl !== 'classic';

                        return (
                            <div key={tpl} className="snap-center shrink-0 w-[85vw] max-w-sm relative flex flex-col items-center justify-center h-full">
                                
                                {/* Card Container */}
                                <div className={`w-full ${style.bg} ${style.text} ${style.font} rounded-3xl shadow-2xl relative overflow-hidden aspect-[9/16] flex flex-col transition-all duration-500`}>
                                    
                                    {/* VIP Overlay */}
                                    {isLocked && (
                                        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center">
                                            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
                                                <Lock size={32} />
                                            </div>
                                            <h3 className="text-2xl font-bold mb-2">VIP 专属模板</h3>
                                            <p className="text-sm opacity-80 mb-8 leading-relaxed">
                                                解锁{tpl === 'ucl' ? '欧冠' : '赛博'}主题战报<br/>
                                                秀出你的高光时刻
                                            </p>
                                            <button 
                                                onClick={() => navigate('/vip-subscribe')}
                                                className="bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold py-3 px-8 rounded-full shadow-lg active:scale-95 transition-transform flex items-center gap-2"
                                            >
                                                <Award size={18} /> 立即解锁
                                            </button>
                                        </div>
                                    )}

                                    {/* Background Effects */}
                                    {tpl === 'ucl' && (
                                        <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent bg-[length:20px_20px]"></div>
                                    )}
                                    {tpl === 'cyber' && (
                                        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[linear-gradient(45deg,#00ff9d_1px,transparent_1px),linear-gradient(-45deg,#00ff9d_1px,transparent_1px)] bg-[length:20px_20px]"></div>
                                    )}

                                    {/* Header */}
                                    <div className="pt-10 px-6 text-center z-10">
                                        <div className="text-xs tracking-[0.4em] uppercase opacity-60 mb-3 font-bold">Match Report</div>
                                        <div className={`text-5xl font-black italic tracking-tighter ${style.accent} drop-shadow-lg`}>
                                            {selectedMatch.myScore > selectedMatch.opponentScore ? 'VICTORY' : selectedMatch.myScore === selectedMatch.opponentScore ? 'DRAW' : 'FULL TIME'}
                                        </div>
                                        <div className="text-xs mt-3 opacity-70 font-medium flex items-center justify-center gap-2">
                                            <span>{selectedMatch.date}</span>
                                            <span>•</span>
                                            <span>{selectedMatch.location}</span>
                                        </div>
                                    </div>

                                    {/* Score Section */}
                                    <div className={`flex justify-center items-center gap-4 z-10 transition-all duration-500 ${tpl === 'classic' ? 'flex-1 scale-110' : 'my-8'}`}>
                                         <div className="flex flex-col items-center gap-3 w-24">
                                             <div className={`w-16 h-16 rounded-full p-1 ${style.border} bg-white/5 backdrop-blur-sm`}>
                                                <img src={myTeam.logo} className="w-full h-full rounded-full object-cover" alt="my" />
                                             </div>
                                             <span className="text-xs font-bold truncate w-full text-center leading-tight">{myTeam.name}</span>
                                         </div>
                                         
                                         <div className={`text-6xl font-black font-mono ${style.accent} flex items-center gap-1 drop-shadow-2xl`}>
                                             <span>{selectedMatch.myScore ?? 0}</span>
                                             <span className="opacity-50 text-4xl relative -top-1">-</span>
                                             <span>{selectedMatch.opponentScore ?? 0}</span>
                                         </div>

                                         <div className="flex flex-col items-center gap-3 w-24">
                                             <div className={`w-16 h-16 rounded-full p-1 ${style.border} bg-white/5 backdrop-blur-sm`}>
                                                <img src={selectedMatch.opponentLogo} className="w-full h-full rounded-full object-cover" alt="opp" />
                                             </div>
                                             <span className="text-xs font-bold truncate w-full text-center leading-tight">{selectedMatch.opponentName}</span>
                                         </div>
                                    </div>

                                    {/* MVP & Stats - Only for non-classic */}
                                    {tpl !== 'classic' && (
                                        <>
                                            {selectedMatch.mvpPlayerId && (
                                                <div className="px-6 mb-4 z-10">
                                                    <div className={`${style.cardBg} rounded-2xl p-3 flex items-center gap-4 border ${style.border} shadow-lg`}>
                                                        <div className="relative">
                                                            <div className={`w-14 h-14 rounded-full p-0.5 ${tpl === 'ucl' ? 'bg-gradient-to-tr from-yellow-300 to-yellow-600' : 'bg-white/20'}`}>
                                                                <img src={getPlayerAvatar(selectedMatch.mvpPlayerId)} className="w-full h-full rounded-full object-cover" alt="mvp" />
                                                            </div>
                                                            <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">MVP</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] opacity-60 uppercase tracking-wider font-bold">Man of the Match</div>
                                                            <div className={`text-xl font-bold ${style.accent}`}>{getPlayerName(selectedMatch.mvpPlayerId)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="px-6 flex-1 overflow-hidden z-10 flex gap-3">
                                                {/* Goals */}
                                                <div className={`flex-1 ${style.cardBg} rounded-2xl p-4 border ${style.border} shadow-lg flex flex-col`}>
                                                    <div className={`text-xs font-bold uppercase mb-3 opacity-70 flex items-center gap-1 border-b ${style.border} pb-2`}>
                                                        <span>⚽</span> Goals
                                                    </div>
                                                    <div className="space-y-2 overflow-y-auto no-scrollbar flex-1">
                                                        {selectedMatch.goals?.length ? selectedMatch.goals.map((g, i) => (
                                                            <div key={i} className="flex justify-between items-center text-sm">
                                                                <span className="font-medium truncate opacity-90">{getPlayerName(g.playerId)}</span>
                                                                <span className={`${style.accent} font-bold`}>x{g.count}</span>
                                                            </div>
                                                        )) : <div className="text-xs opacity-40 text-center py-4">No Goals</div>}
                                                    </div>
                                                </div>

                                                {/* Assists */}
                                                <div className={`flex-1 ${style.cardBg} rounded-2xl p-4 border ${style.border} shadow-lg flex flex-col`}>
                                                    <div className={`text-xs font-bold uppercase mb-3 opacity-70 flex items-center gap-1 border-b ${style.border} pb-2`}>
                                                        <span>👟</span> Assists
                                                    </div>
                                                    <div className="space-y-2 overflow-y-auto no-scrollbar flex-1">
                                                        {selectedMatch.assists?.length ? selectedMatch.assists.map((a, i) => (
                                                            <div key={i} className="flex justify-between items-center text-sm">
                                                                <span className="font-medium truncate opacity-90">{getPlayerName(a.playerId)}</span>
                                                                <span className={`${style.accent} font-bold`}>x{a.count}</span>
                                                            </div>
                                                        )) : <div className="text-xs opacity-40 text-center py-4">No Assists</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="mt-auto py-6 text-center z-10">
                                        <div className="text-[8px] opacity-40 tracking-[0.5em] uppercase font-medium">Generated by Spot On</div>
                                    </div>
                                </div>

                                {/* Actions - Only show if not locked */}
                                {!isLocked && (
                                    <div className="mt-6 w-full">
                                        <button className="w-full bg-[#07c160] text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/50 active:scale-95 transition-transform">
                                            <Share2 size={20} /> 保存图片 / 分享
                                        </button>
                                    </div>
                                )}
                                {isLocked && (
                                    <div className="mt-6 w-full h-[52px]"></div> // Spacer to keep alignment
                                )}
                            </div>
                        );
                    })}
                </div>
                
                {/* Pagination / Hint */}
                <div className="pb-8 text-center">
                    <div className="flex justify-center gap-2 mb-2">
                        {['classic', 'ucl', 'cyber'].map((t, i) => (
                            <div 
                                key={t} 
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${activeTemplate === t ? 'bg-white w-4' : 'bg-white/30'}`}
                            ></div>
                        ))}
                    </div>
                    <div className="text-white/30 text-xs">左右滑动切换模板</div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Matches;