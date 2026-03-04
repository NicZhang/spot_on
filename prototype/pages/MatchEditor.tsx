import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import NavBar from '../components/NavBar';
import { Save, Minus, Plus, Trophy, Medal, Check, AlertCircle, ChevronRight, X } from 'lucide-react';
import { MatchRecord } from '../types';

type EditorStep = 'score' | 'lineup' | 'stats' | 'confirm';

const STEPS: { key: EditorStep; label: string }[] = [
  { key: 'score', label: '比分' },
  { key: 'lineup', label: '出勤' },
  { key: 'stats', label: '数据' },
  { key: 'confirm', label: '确认' },
];

const MatchEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mySchedule, players, completeMatch, myTeam } = useApp();

  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [mvpId, setMvpId] = useState<string | null>(null);

  // Lineup & Cost
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [totalFee, setTotalFee] = useState(600);

  // Track goals and assists per player
  type PlayerStatEntry = { goals: number; assists: number };
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStatEntry>>({});

  // Step navigation
  const [currentStep, setCurrentStep] = useState<EditorStep>('score');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submit flow state
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  useEffect(() => {
    const found = mySchedule.find(m => m.id === id);
    if (found) {
      setMatch(found);
      setMyScore(found.myScore || 0);
      setOpponentScore(found.opponentScore || 0);
      setMvpId(found.mvpPlayerId || null);

      if (found.lineup && found.lineup.length > 0) {
        setSelectedPlayerIds(found.lineup);
      } else if (players) {
        setSelectedPlayerIds(players.map(p => p.id));
      }

      if (found.totalFee) setTotalFee(found.totalFee);

      const stats: Record<string, PlayerStatEntry> = {};
      if (players) {
        players.forEach(p => {
          const g = found.goals?.find(g => g.playerId === p.id)?.count || 0;
          const a = found.assists?.find(a => a.playerId === p.id)?.count || 0;
          stats[p.id] = { goals: g, assists: a };
        });
      }
      setPlayerStats(stats);
    }
  }, [id, mySchedule, players]);

  // Sync total score from individual goals
  useEffect(() => {
    const totalGoals = (Object.values(playerStats) as PlayerStatEntry[]).reduce((sum, s) => sum + s.goals, 0);
    if (totalGoals > myScore) {
      setMyScore(totalGoals);
    }
  }, [playerStats]);

  const togglePlayerSelection = (pid: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
    );
    // Clear lineup error when user selects a player
    if (errors.lineup) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.lineup;
        return next;
      });
    }
  };

  const updateStat = (playerId: string, type: 'goals' | 'assists', delta: number) => {
    if (!selectedPlayerIds.includes(playerId) && delta > 0) {
      setSelectedPlayerIds(prev => [...prev, playerId]);
    }

    setPlayerStats(prev => {
      const current = prev[playerId] || { goals: 0, assists: 0 };
      const newVal = Math.max(0, current[type] + delta);
      return {
        ...prev,
        [playerId]: { ...current, [type]: newVal },
      };
    });
  };

  // Validation per step
  const validateStep = (step: EditorStep): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 'score') {
      // Score is always valid (can be 0-0)
    }

    if (step === 'lineup') {
      if (selectedPlayerIds.length === 0) {
        newErrors.lineup = '请至少选择一名出勤球员';
      }
      if (totalFee < 0) {
        newErrors.totalFee = '费用不能为负数';
      }
    }

    if (step === 'stats') {
      const totalGoals = (Object.values(playerStats) as PlayerStatEntry[]).reduce((sum, s) => sum + s.goals, 0);
      if (totalGoals > myScore) {
        newErrors.stats = `个人进球总和 (${totalGoals}) 超过了球队比分 (${myScore})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToStep = (step: EditorStep) => {
    const currentIdx = STEPS.findIndex(s => s.key === currentStep);
    const targetIdx = STEPS.findIndex(s => s.key === step);

    // Can always go back; going forward requires validation
    if (targetIdx > currentIdx) {
      if (!validateStep(currentStep)) return;
    }
    setCurrentStep(step);
  };

  const goNext = () => {
    const currentIdx = STEPS.findIndex(s => s.key === currentStep);
    if (currentIdx < STEPS.length - 1) {
      goToStep(STEPS[currentIdx + 1].key);
    }
  };

  const goPrev = () => {
    const currentIdx = STEPS.findIndex(s => s.key === currentStep);
    if (currentIdx > 0) {
      setCurrentStep(STEPS[currentIdx - 1].key);
    }
  };

  if (!match) return <div className="p-4">Loading...</div>;
  if (!players) return <div className="p-4">Loading players...</div>;

  const perHeadFee = selectedPlayerIds.length > 0 ? Math.ceil(totalFee / selectedPlayerIds.length) : 0;
  const activePlayers = players.filter(p => selectedPlayerIds.includes(p.id));

  const handleSubmit = () => {
    if (!match) return;
    setSubmitStatus('submitting');

    const goals = (Object.entries(playerStats) as [string, PlayerStatEntry][])
      .filter(([_, stats]) => stats.goals > 0)
      .map(([pid, stats]) => ({ playerId: pid, count: stats.goals }));

    const assists = (Object.entries(playerStats) as [string, PlayerStatEntry][])
      .filter(([_, stats]) => stats.assists > 0)
      .map(([pid, stats]) => ({ playerId: pid, count: stats.assists }));

    const updatedMatch: MatchRecord = {
      ...match,
      status: 'finished',
      myScore,
      opponentScore,
      mvpPlayerId: mvpId || undefined,
      goals,
      assists,
      lineup: selectedPlayerIds,
      totalFee,
      feePerPlayer: perHeadFee,
    };

    setTimeout(() => {
      completeMatch(updatedMatch);
      setSubmitStatus('success');
      setTimeout(() => {
        navigate('/matches');
      }, 1800);
    }, 1200);
  };

  const currentStepIdx = STEPS.findIndex(s => s.key === currentStep);

  // Build summary data for confirm step
  const totalGoals = (Object.values(playerStats) as PlayerStatEntry[]).reduce((sum, s) => sum + s.goals, 0);
  const totalAssists = (Object.values(playerStats) as PlayerStatEntry[]).reduce((sum, s) => sum + s.assists, 0);
  const mvpPlayer = players.find(p => p.id === mvpId);
  const resultLabel = myScore > opponentScore ? '胜' : myScore < opponentScore ? '负' : '平';
  const resultColor = myScore > opponentScore ? 'text-[#07c160]' : myScore < opponentScore ? 'text-red-500' : 'text-gray-500';

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <NavBar title="录入比赛数据" showBack />

      {/* Success Overlay */}
      {submitStatus === 'success' && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 mx-6 text-center animate-in zoom-in duration-300 shadow-2xl">
            <div className="w-16 h-16 bg-[#07c160] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
              <Check size={32} className="text-white" strokeWidth={3} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">录入完成</h3>
            <p className="text-sm text-gray-500">比赛记录已保存，账单已生成</p>
            <p className="text-xs text-gray-400 mt-3">正在返回赛程...</p>
          </div>
        </div>
      )}

      {/* Step Progress Indicator */}
      <div className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 z-0"></div>
          <div
            className="absolute top-4 left-6 h-0.5 bg-[#07c160] z-0 transition-all duration-500"
            style={{ width: `${(currentStepIdx / (STEPS.length - 1)) * (100 - 12)}%` }}
          ></div>

          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return (
              <button
                key={step.key}
                onClick={() => goToStep(step.key)}
                className="relative z-10 flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[#07c160] border-[#07c160] text-white'
                      : isCurrent
                      ? 'bg-white border-[#07c160] text-[#07c160] shadow-md shadow-green-100'
                      : 'bg-white border-gray-200 text-gray-400'
                  }`}
                >
                  {isCompleted ? <Check size={14} strokeWidth={3} /> : idx + 1}
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    isCurrent ? 'text-[#07c160] font-bold' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="px-4 mt-4">
        {/* ---- STEP: SCORE ---- */}
        {currentStep === 'score' && (
          <div className="space-y-4">
            {/* Scoreboard Section - Hero Card */}
            <div className="bg-[#1b2838] text-white pt-6 pb-8 px-4 relative overflow-hidden rounded-2xl shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -left-20 w-60 h-60 bg-[#07c160]/20 rounded-full blur-[80px]"></div>
                <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-blue-500/20 rounded-full blur-[80px]"></div>
              </div>

              <div className="relative z-10">
                <div className="flex justify-center mb-4">
                  <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#07c160] animate-pulse"></div>
                    <span className="text-[10px] text-white/70 font-medium">仅本队可见，对方无法查看</span>
                  </div>
                </div>

                <div className="flex justify-between items-start px-2">
                  {/* My Team */}
                  <div className="flex flex-col items-center w-28">
                    <div className="relative mb-3">
                      <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-[#07c160] to-emerald-600 shadow-lg shadow-[#07c160]/30">
                        <img src={myTeam.logo} className="w-full h-full rounded-full border-2 border-[#1b2838] object-cover" alt="my" />
                      </div>
                    </div>
                    <span className="font-bold text-sm text-center leading-tight mb-4 h-8 flex items-center">{myTeam.name}</span>

                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => setMyScore(s => s + 1)}
                        className="w-12 h-10 bg-[#07c160] rounded-t-xl flex items-center justify-center active:bg-[#06ad55] transition-colors shadow-lg"
                      >
                        <Plus size={20} />
                      </button>
                      <div className="w-16 h-14 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/10">
                        <span className="text-4xl font-black font-mono tracking-tighter">{myScore}</span>
                      </div>
                      <button
                        onClick={() => setMyScore(s => Math.max(0, s - 1))}
                        className="w-12 h-10 bg-white/10 rounded-b-xl flex items-center justify-center active:bg-white/20 transition-colors"
                      >
                        <Minus size={16} className="text-white/70" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-20 text-white/20 font-black text-xl italic">VS</div>

                  {/* Opponent Team */}
                  <div className="flex flex-col items-center w-28">
                    <div className="relative mb-3">
                      <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30">
                        <img src={match.opponentLogo} className="w-full h-full rounded-full border-2 border-[#1b2838] object-cover" alt="opp" />
                      </div>
                    </div>
                    <span className="font-bold text-sm text-center leading-tight mb-4 h-8 flex items-center">{match.opponentName}</span>

                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => setOpponentScore(s => s + 1)}
                        className="w-12 h-10 bg-red-500 rounded-t-xl flex items-center justify-center active:bg-red-600 transition-colors shadow-lg"
                      >
                        <Plus size={20} />
                      </button>
                      <div className="w-16 h-14 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/10">
                        <span className="text-4xl font-black font-mono tracking-tighter">{opponentScore}</span>
                      </div>
                      <button
                        onClick={() => setOpponentScore(s => Math.max(0, s - 1))}
                        className="w-12 h-10 bg-white/10 rounded-b-xl flex items-center justify-center active:bg-white/20 transition-colors"
                      >
                        <Minus size={16} className="text-white/70" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- STEP: LINEUP ---- */}
        {currentStep === 'lineup' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-[#07c160] rounded-full"></div>
                  <span className="font-bold text-gray-800 text-sm">出勤名单</span>
                  <span className="bg-[#07c160]/10 text-[#07c160] text-[10px] px-1.5 py-0.5 rounded-md font-bold">{selectedPlayerIds.length}人</span>
                </div>

                {/* Fee Input */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                  <span className="text-xs text-gray-400">总费</span>
                  <span className="text-xs font-bold text-gray-800">¥</span>
                  <input
                    type="number"
                    value={totalFee}
                    onChange={(e) => {
                      setTotalFee(parseInt(e.target.value) || 0);
                      if (errors.totalFee) {
                        setErrors(prev => { const n = { ...prev }; delete n.totalFee; return n; });
                      }
                    }}
                    className="w-12 text-center font-bold text-gray-900 outline-none p-0 border-none focus:ring-0 text-sm"
                  />
                </div>
              </div>

              <div className="p-4">
                {errors.lineup && (
                  <div className="mb-3 flex items-center gap-2 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-100">
                    <AlertCircle size={14} />
                    <span>{errors.lineup}</span>
                  </div>
                )}
                {errors.totalFee && (
                  <div className="mb-3 flex items-center gap-2 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-100">
                    <AlertCircle size={14} />
                    <span>{errors.totalFee}</span>
                  </div>
                )}

                <div className="grid grid-cols-5 gap-y-4 gap-x-2">
                  {players.map(p => {
                    const isSelected = selectedPlayerIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => togglePlayerSelection(p.id)}
                        className="flex flex-col items-center gap-1.5 cursor-pointer group"
                      >
                        <div className="relative">
                          <div className={`w-11 h-11 rounded-full p-0.5 transition-all duration-300 ${isSelected ? 'bg-gradient-to-tr from-[#07c160] to-emerald-400 shadow-md scale-105' : 'bg-transparent grayscale opacity-50'}`}>
                            <img src={p.avatar} className="w-full h-full rounded-full object-cover border-2 border-white" alt={p.name} />
                          </div>
                          {isSelected && (
                            <div className="absolute -bottom-1 -right-1 bg-[#07c160] text-white rounded-full p-0.5 border-2 border-white shadow-sm">
                              <Check size={8} strokeWidth={4} />
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] truncate w-full text-center font-medium transition-colors ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}>
                          {p.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Auto-calculated AA Fee Display */}
                <div className="mt-4 pt-3 border-t border-dashed border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">人均分摊 (AA)</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-[#07c160]">¥</span>
                      <span className="text-xl font-black text-[#07c160] font-mono">{perHeadFee}</span>
                    </div>
                  </div>
                  {selectedPlayerIds.length > 0 && (
                    <div className="text-[10px] text-gray-400 text-right mt-1">
                      ¥{totalFee} / {selectedPlayerIds.length}人 = ¥{perHeadFee}/人
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- STEP: STATS ---- */}
        {currentStep === 'stats' && (
          <div className="space-y-4">
            {/* MVP Selection */}
            {selectedPlayerIds.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={16} className="text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-gray-800 text-sm">本场 MVP</span>
                  {!mvpId && <span className="text-[10px] text-gray-400">(可选)</span>}
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {activePlayers.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setMvpId(mvpId === p.id ? null : p.id)}
                      className={`flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 ${mvpId === p.id ? 'scale-105' : 'opacity-50 grayscale-[0.5]'}`}
                    >
                      <div className={`w-14 h-14 rounded-full p-0.5 ${mvpId === p.id ? 'bg-gradient-to-tr from-yellow-300 to-orange-500 shadow-lg shadow-orange-200' : 'bg-gray-100'}`}>
                        <img src={p.avatar} className="w-full h-full rounded-full object-cover border-2 border-white" alt={p.name} />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mvpId === p.id ? 'bg-orange-50 text-orange-600' : 'text-gray-400'}`}>
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Player Stats List */}
            {selectedPlayerIds.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Medal size={16} className="text-blue-500 fill-blue-500" />
                    <span className="font-bold text-gray-800 text-sm">数据统计</span>
                  </div>
                </div>

                {errors.stats && (
                  <div className="mb-3 flex items-center gap-2 bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-lg border border-amber-100">
                    <AlertCircle size={14} />
                    <span>{errors.stats}</span>
                  </div>
                )}

                <div className="space-y-1">
                  {activePlayers.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3 w-1/3">
                        <img src={p.avatar} className="w-9 h-9 rounded-full bg-gray-100 object-cover" alt={p.name} />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-800 leading-tight">{p.name}</span>
                          <span className="text-[10px] text-gray-400">{p.number}号</span>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        {/* Goals */}
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-gray-400 font-medium">进球</span>
                          <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                            <button
                              onClick={() => updateStat(p.id, 'goals', -1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 active:bg-gray-200 active:text-gray-600 transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span className={`w-6 text-center font-bold ${playerStats[p.id]?.goals > 0 ? 'text-[#07c160]' : 'text-gray-300'}`}>
                              {playerStats[p.id]?.goals || 0}
                            </span>
                            <button
                              onClick={() => updateStat(p.id, 'goals', 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm text-[#07c160] border border-gray-100 active:scale-95 transition-transform"
                            >
                              <Plus size={12} strokeWidth={3} />
                            </button>
                          </div>
                        </div>

                        {/* Assists */}
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-gray-400 font-medium">助攻</span>
                          <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                            <button
                              onClick={() => updateStat(p.id, 'assists', -1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 active:bg-gray-200 active:text-gray-600 transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span className={`w-6 text-center font-bold ${playerStats[p.id]?.assists > 0 ? 'text-blue-500' : 'text-gray-300'}`}>
                              {playerStats[p.id]?.assists || 0}
                            </span>
                            <button
                              onClick={() => updateStat(p.id, 'assists', 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm text-blue-500 border border-gray-100 active:scale-95 transition-transform"
                            >
                              <Plus size={12} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- STEP: CONFIRM ---- */}
        {currentStep === 'confirm' && (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Match Result Header */}
              <div className="bg-[#1b2838] text-white p-5 text-center">
                <div className="text-xs text-white/50 mb-2">{match.date} | {match.location}</div>
                <div className="flex items-center justify-center gap-6">
                  <div className="flex flex-col items-center">
                    <img src={myTeam.logo} className="w-10 h-10 rounded-full border-2 border-white/20 mb-1" alt="my" />
                    <span className="text-xs text-white/70">{myTeam.name}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono">{myScore}</span>
                    <span className="text-white/30 text-lg">:</span>
                    <span className="text-3xl font-black font-mono">{opponentScore}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <img src={match.opponentLogo} className="w-10 h-10 rounded-full border-2 border-white/20 mb-1" alt="opp" />
                    <span className="text-xs text-white/70">{match.opponentName}</span>
                  </div>
                </div>
                <div className={`mt-2 text-sm font-bold ${resultColor}`}>{resultLabel}</div>
              </div>

              {/* Summary Details */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
                  <span className="text-gray-500">出勤人数</span>
                  <span className="text-gray-900 font-bold">{selectedPlayerIds.length} 人</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
                  <span className="text-gray-500">总费用</span>
                  <span className="text-gray-900 font-bold">¥{totalFee}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
                  <span className="text-gray-500">人均 AA</span>
                  <span className="text-[#07c160] font-bold">¥{perHeadFee}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
                  <span className="text-gray-500">进球 / 助攻</span>
                  <span className="text-gray-900 font-bold">{totalGoals} / {totalAssists}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">本场 MVP</span>
                  {mvpPlayer ? (
                    <div className="flex items-center gap-2">
                      <img src={mvpPlayer.avatar} className="w-5 h-5 rounded-full" alt="" />
                      <span className="text-amber-600 font-bold">{mvpPlayer.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">未选择</span>
                  )}
                </div>
              </div>
            </div>

            {/* Confirm Note */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700">
                <span className="font-bold">提交后将自动生成 AA 账单</span>
                <span className="block mt-0.5">队员钱包将扣除 ¥{perHeadFee}/人，请确认数据无误。</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 z-30 max-w-md mx-auto">
        {currentStep === 'confirm' ? (
          <div className="flex gap-3">
            <button
              onClick={goPrev}
              className="flex-1 bg-gray-100 text-gray-700 font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-all text-sm"
            >
              返回修改
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitStatus !== 'idle'}
              className="flex-[2] bg-[#07c160] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-[#07c160]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base disabled:opacity-60"
            >
              {submitStatus === 'submitting' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  提交中...
                </>
              ) : (
                <>
                  <Save size={20} /> 确认提交
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            {currentStepIdx > 0 && (
              <button
                onClick={goPrev}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-all text-sm"
              >
                上一步
              </button>
            )}
            <button
              onClick={goNext}
              className={`${currentStepIdx > 0 ? 'flex-[2]' : 'flex-1'} bg-[#07c160] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-[#07c160]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base`}
            >
              下一步 <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchEditor;
