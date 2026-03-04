import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import NavBar from '../components/NavBar';
import { Share2, Award, Download, Calendar, MapPin, Clock, Edit3, ChevronRight, X, Lock, Trophy, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Skeleton card for loading state
const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden border-l-4 border-gray-200 animate-pulse">
    <div className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="h-6 w-28 bg-gray-200 rounded" />
        <div className="h-5 w-20 bg-gray-200 rounded" />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200" />
          <div>
            <div className="h-5 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="h-8 w-12 bg-gray-200 rounded" />
      </div>
      <div className="h-10 w-full bg-gray-200 rounded-lg" />
    </div>
  </div>
);

// Empty state component
const EmptyState: React.FC<{ message: string; sub: string }> = ({ message, sub }) => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <Trophy size={32} className="text-gray-300" />
    </div>
    <div className="text-gray-400 font-medium text-sm">{message}</div>
    <div className="text-gray-300 text-xs mt-1">{sub}</div>
  </div>
);

const Matches: React.FC = () => {
  const { mySchedule, myTeam, players, role, updateMatchRecord, completeMatch } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showReport, setShowReport] = useState<string | null>(null);
  const isVip = role === UserRole.VIP_CAPTAIN;

  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');
  const [activeTemplate, setActiveTemplate] = useState<'classic' | 'ucl' | 'cyber'>('classic');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Loading skeleton state
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Inline confirm state for the "opponent confirms" flow
  const [confirmingMatchId, setConfirmingMatchId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Swipe hint for first modal open
  const [hasShownSwipeHint, setHasShownSwipeHint] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  // Auto open report if query param exists
  useEffect(() => {
      const reportId = searchParams.get('report');
      if (reportId) {
          setShowReport(reportId);
      }
  }, [searchParams]);

  // Scroll to active template when modal opens + swipe hint
  useEffect(() => {
      if (showReport && scrollContainerRef.current) {
          const index = ['classic', 'ucl', 'cyber'].indexOf(activeTemplate);
          if (index !== -1) {
              const container = scrollContainerRef.current;
              setTimeout(() => {
                  if (container.children[index]) {
                      container.children[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }
              }, 100);
          }

          // Show swipe hint animation on first open
          if (!hasShownSwipeHint) {
              setShowSwipeHint(true);
              setHasShownSwipeHint(true);
              setTimeout(() => setShowSwipeHint(false), 2500);
          }
      }
  }, [showReport]);

  const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const center = container.scrollLeft + container.clientWidth / 2;

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

      const templateList = ['classic', 'ucl', 'cyber'] as const;
      if (templateList[closestIndex]) {
          setActiveTemplate(templateList[closestIndex]);
      }
  };

  const handleGenerateReport = (id: string) => {
    setShowReport(id);
    setActiveTemplate(isVip ? 'ucl' : 'classic');
  };

  const handleTemplateChange = (tpl: 'classic' | 'ucl' | 'cyber') => {
      if (!isVip && tpl !== 'classic') {
          navigate('/vip-subscribe');
          return;
      }
      setActiveTemplate(tpl);
  };

  // Proper flow: inline confirm then call completeMatch + updateMatchRecord
  const handleConfirmMatch = (id: string) => {
      setConfirmingMatchId(id);
  };

  const executeConfirmMatch = (id: string) => {
      setConfirmLoading(true);
      const match = mySchedule.find(m => m.id === id);
      if (match) {
          const finishedRecord = { ...match, status: 'finished' as const };
          updateMatchRecord(finishedRecord);
          completeMatch(finishedRecord);
      }
      setTimeout(() => {
          setConfirmLoading(false);
          setConfirmingMatchId(null);
      }, 500);
  };

  const selectedMatch = mySchedule.find(h => h.id === showReport);

  // Filter lists
  const upcomingMatches = mySchedule.filter(m => m.status === 'upcoming' || m.status === 'pending_report' || m.status === 'waiting_confirmation' || m.status === 'confirm_needed');
  const finishedMatches = mySchedule.filter(m => m.status === 'finished');

  // Helper to get player name
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || '未知球员';
  const getPlayerAvatar = (id: string) => players.find(p => p.id === id)?.avatar || '';

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return (
          <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full font-bold flex items-center gap-1">
            <Calendar size={12} /> 即将开始
          </span>
        );
      case 'pending_report':
        return (
          <span className="text-xs bg-red-100 text-red-500 px-2 py-1 rounded-full font-bold animate-pulse flex items-center gap-1">
            <AlertTriangle size={12} /> 待录入比分
          </span>
        );
      case 'waiting_confirmation':
        return (
          <span className="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-full font-bold flex items-center gap-1">
            <Clock size={12} /> 等待对手确认
          </span>
        );
      case 'confirm_needed':
        return (
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-bold flex items-center gap-1">
            <CheckCircle size={12} /> 待我方确认
          </span>
        );
      case 'finished':
        return (
          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full font-bold">
            已结束
          </span>
        );
      default:
        return null;
    }
  };

  // Border color by status
  const getBorderColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'border-emerald-500';
      case 'pending_report': return 'border-red-500';
      case 'waiting_confirmation': return 'border-amber-500';
      case 'confirm_needed': return 'border-blue-500';
      case 'finished': return 'border-gray-300';
      default: return 'border-gray-300';
    }
  };

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
          accent: "text-[#d4af37]",
          border: "border-white/10",
          subText: "text-blue-200",
          cardBg: "bg-white/10 backdrop-blur-md",
          font: "font-serif"
      },
      cyber: {
          bg: "bg-black",
          text: "text-white",
          accent: "text-[#00ff9d]",
          border: "border-[#00ff9d]/30",
          subText: "text-gray-400",
          cardBg: "bg-gray-900/80 border border-[#00ff9d]/20",
          font: "font-mono"
      }
  };

  const currentStyle = templates[activeTemplate];

  const templateLabels: Record<string, string> = {
    classic: '经典',
    ucl: '欧冠',
    cyber: '赛博',
  };

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
                {/* Skeleton loading */}
                {isLoading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : upcomingMatches.length === 0 ? (
                  <EmptyState message="暂无赛程安排" sub="去广场约一场比赛吧" />
                ) : (
                  upcomingMatches.map(match => (
                    <div key={match.id} className={`bg-white rounded-xl shadow-sm overflow-hidden border-l-4 ${getBorderColor(match.status)}`}>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2 text-[#07c160] font-bold text-sm bg-[#07c160]/10 px-2 py-1 rounded">
                                    <Calendar size={14} /> {match.date}
                                </div>
                                {getStatusBadge(match.status)}
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
                                    {confirmingMatchId === match.id ? (
                                      // Inline confirmation UI
                                      <div className="space-y-2">
                                        <div className="text-xs text-amber-800 font-bold flex items-center gap-1">
                                          <AlertTriangle size={14} /> 确认比分 {match.myScore}:{match.opponentScore} 无误？
                                        </div>
                                        <div className="text-xs text-amber-600 mb-1">
                                          确认后将更新胜率和信用分，此操作不可撤销。
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => setConfirmingMatchId(null)}
                                            className="flex-1 bg-white border border-amber-200 text-amber-700 py-2 rounded font-bold text-xs active:scale-95 transition-transform"
                                            disabled={confirmLoading}
                                          >
                                            取消
                                          </button>
                                          <button
                                            onClick={() => executeConfirmMatch(match.id)}
                                            className="flex-1 bg-amber-500 text-white py-2 rounded font-bold text-xs shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-1"
                                            disabled={confirmLoading}
                                          >
                                            {confirmLoading ? (
                                              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                              <><CheckCircle size={14} /> 确认无误</>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      // Default waiting state
                                      <>
                                        <div className="text-xs text-amber-700 mb-2">
                                            已提交比分 {match.myScore}:{match.opponentScore}，等待 {match.opponentName} 确认中...
                                            <br/>
                                            <span className="opacity-70">确认后将自动更新胜率和信用分</span>
                                        </div>
                                        <button
                                            onClick={() => handleConfirmMatch(match.id)}
                                            className="w-full bg-amber-500 text-white py-2 rounded font-bold text-xs active:scale-95 transition-transform flex items-center justify-center gap-1"
                                        >
                                            <CheckCircle size={14} /> 确认比分结果
                                        </button>
                                      </>
                                    )}
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
                  ))
                )}
            </div>
        ) : (
            <div className="space-y-4">
                {isLoading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : finishedMatches.length === 0 ? (
                  <EmptyState message="暂无历史战绩" sub="完成比赛后会在这里显示" />
                ) : (
                  finishedMatches.map(match => (
                    <div key={match.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                        {/* Scoreboard */}
                        <div className="bg-[#1b2838] p-6 text-white text-center relative">
                            <div className="text-xs text-gray-400 mb-4">{match.date} {match.format && `\u00b7 ${match.format}`}</div>
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
                  ))
                )}
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

                {/* Swipe Hint Animation Overlay */}
                {showSwipeHint && (
                  <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-black/70 text-white/80 px-5 py-3 rounded-full text-sm font-medium animate-bounce">
                      <ChevronRight size={16} className="animate-pulse" />
                      左右滑动切换模板
                      <ChevronRight size={16} className="animate-pulse rotate-180" />
                    </div>
                  </div>
                )}

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
                                            {selectedMatch.myScore! > selectedMatch.opponentScore! ? 'VICTORY' : selectedMatch.myScore === selectedMatch.opponentScore ? 'DRAW' : 'FULL TIME'}
                                        </div>
                                        <div className="text-xs mt-3 opacity-70 font-medium flex items-center justify-center gap-2">
                                            <span>{selectedMatch.date}</span>
                                            <span>&bull;</span>
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
                                                        <span>&#9917;</span> Goals
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
                                                        <span>&#128095;</span> Assists
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
                                    <div className="mt-6 w-full h-[52px]"></div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Pagination Dots + Template Labels */}
                <div className="pb-8 text-center">
                    <div className="flex justify-center gap-2 mb-1.5">
                        {(['classic', 'ucl', 'cyber'] as const).map((t) => (
                            <div
                                key={t}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${activeTemplate === t ? 'bg-white w-4' : 'bg-white/30'}`}
                            ></div>
                        ))}
                    </div>
                    <div className="flex justify-center gap-6 mb-2">
                        {(['classic', 'ucl', 'cyber'] as const).map((t) => (
                            <span
                                key={t}
                                className={`text-xs transition-all duration-300 ${activeTemplate === t ? 'text-white/80 font-bold' : 'text-white/30'}`}
                            >
                                {templateLabels[t]}
                            </span>
                        ))}
                    </div>
                    <div className="text-white/20 text-[10px]">左右滑动切换模板</div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Matches;
