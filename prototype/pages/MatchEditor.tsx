import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import NavBar from '../components/NavBar';
import { Save, Minus, Plus, Trophy, User, Medal, Clock } from 'lucide-react';
import { MatchRecord } from '../types';

const MatchEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mySchedule, players, updateMatchRecord, completeMatch, myTeam } = useApp();
  
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [mvpId, setMvpId] = useState<string | null>(null);
  
  // Lineup & Cost
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [totalFee, setTotalFee] = useState(600); // Default fee
  
  // Track goals and assists per player
  const [playerStats, setPlayerStats] = useState<{ [key: string]: { goals: number, assists: number } }>({});

  useEffect(() => {
    const found = mySchedule.find(m => m.id === id);
    if (found) {
        setMatch(found);
        setMyScore(found.myScore || 0);
        setOpponentScore(found.opponentScore || 0);
        setMvpId(found.mvpPlayerId || null);
        
        // Default select all players if not set
        if (found.lineup && found.lineup.length > 0) {
            setSelectedPlayerIds(found.lineup);
        } else {
            // Check if players exists before mapping
            if (players) {
                setSelectedPlayerIds(players.map(p => p.id));
            }
        }
        
        if (found.totalFee) setTotalFee(found.totalFee);
        
        // Init stats
        const stats: any = {};
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

  // Sync total score... (existing code)
  useEffect(() => {
      const totalGoals = Object.values(playerStats).reduce((sum, s) => sum + s.goals, 0);
      if (totalGoals > myScore) {
          setMyScore(totalGoals);
      }
  }, [playerStats]);

  const togglePlayerSelection = (pid: string) => {
      setSelectedPlayerIds(prev => 
          prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
      );
  };

  const updateStat = (playerId: string, type: 'goals' | 'assists', delta: number) => {
      // Auto select player if they have stats
      if (!selectedPlayerIds.includes(playerId) && delta > 0) {
          setSelectedPlayerIds(prev => [...prev, playerId]);
      }
      
      setPlayerStats(prev => {
          const current = prev[playerId] || { goals: 0, assists: 0 };
          const newVal = Math.max(0, current[type] + delta);
          return {
              ...prev,
              [playerId]: { ...current, [type]: newVal }
          };
      });
  };

  if (!match) return <div className="p-4">Loading...</div>;
  if (!players) return <div className="p-4">Loading players...</div>;

  const perHeadFee = selectedPlayerIds.length > 0 ? Math.ceil(totalFee / selectedPlayerIds.length) : 0;

  const handleSave = () => {
      if (!match) return;
      
      const goals = Object.entries(playerStats)
        .filter(([_, stats]) => stats.goals > 0)
        .map(([pid, stats]) => ({ playerId: pid, count: stats.goals }));
        
      const assists = Object.entries(playerStats)
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
          feePerPlayer: perHeadFee
      };

      completeMatch(updatedMatch);
      navigate('/matches');
  };

  // Filter players for stats based on lineup
  const activePlayers = players.filter(p => selectedPlayerIds.includes(p.id));

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <NavBar title="录入比赛数据" showBack />

      {/* 1. Scoreboard Section - Hero Card */}
      <div className="bg-[#1b2838] text-white pt-6 pb-12 px-4 relative overflow-hidden rounded-b-[2.5rem] shadow-2xl mb-6">
          {/* Background Effects */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -left-20 w-60 h-60 bg-[#07c160]/20 rounded-full blur-[80px]"></div>
              <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-blue-500/20 rounded-full blur-[80px]"></div>
          </div>

          <div className="relative z-10">
              {/* Privacy Hint */}
              <div className="flex justify-center mb-6">
                  <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#07c160] animate-pulse"></div>
                      <span className="text-[10px] text-white/70 font-medium">仅本队可见，对方无法查看</span>
                  </div>
              </div>

              {/* Teams & Scores */}
              <div className="flex justify-between items-start px-2">
                  {/* My Team */}
                  <div className="flex flex-col items-center w-28">
                      <div className="relative mb-3">
                          <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-[#07c160] to-emerald-600 shadow-lg shadow-[#07c160]/30">
                              <img src={myTeam.logo} className="w-full h-full rounded-full border-2 border-[#1b2838] object-cover" alt="my" />
                          </div>
                      </div>
                      <span className="font-bold text-sm text-center leading-tight mb-4 h-8 flex items-center">{myTeam.name}</span>
                      
                      {/* Score Controller */}
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

                  {/* VS Divider */}
                  <div className="pt-20 text-white/20 font-black text-xl italic">VS</div>

                  {/* Opponent Team */}
                  <div className="flex flex-col items-center w-28">
                      <div className="relative mb-3">
                          <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30">
                              <img src={match.opponentLogo} className="w-full h-full rounded-full border-2 border-[#1b2838] object-cover" alt="opp" />
                          </div>
                      </div>
                      <span className="font-bold text-sm text-center leading-tight mb-4 h-8 flex items-center">{match.opponentName}</span>
                      
                      {/* Score Controller */}
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

      <div className="px-4 space-y-4 -mt-6 relative z-20">
          {/* 2. Lineup & Fee Card */}
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
                        onChange={(e) => setTotalFee(parseInt(e.target.value) || 0)}
                        className="w-12 text-center font-bold text-gray-900 outline-none p-0 border-none focus:ring-0 text-sm"
                      />
                  </div>
              </div>
              
              <div className="p-4">
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
                                              <Plus size={8} strokeWidth={4} />
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
                  
                  {/* AA Fee Display */}
                  <div className="mt-4 pt-3 border-t border-dashed border-gray-100 flex justify-between items-center">
                      <span className="text-xs text-gray-400">人均分摊 (AA)</span>
                      <div className="flex items-baseline gap-1">
                          <span className="text-xs text-[#07c160]">¥</span>
                          <span className="text-xl font-black text-[#07c160] font-mono">{perHeadFee}</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* 3. MVP Selection */}
          {selectedPlayerIds.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-4">
                      <Trophy size={16} className="text-yellow-500 fill-yellow-500" />
                      <span className="font-bold text-gray-800 text-sm">本场 MVP</span>
                  </div>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
                      {activePlayers.map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => setMvpId(p.id)}
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

          {/* 4. Player Stats List */}
          {selectedPlayerIds.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-4">
                      <Medal size={16} className="text-blue-500 fill-blue-500" />
                      <span className="font-bold text-gray-800 text-sm">数据统计</span>
                  </div>
                  
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

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 z-30 max-w-md mx-auto">
          <button 
            onClick={handleSave}
            className="w-full bg-[#07c160] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-[#07c160]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base"
          >
              <Save size={20} /> 保存记录并生成账单
          </button>
      </div>
    </div>
  );
};

export default MatchEditor;
