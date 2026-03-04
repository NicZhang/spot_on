import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import NavBar from '../components/NavBar';
import VipOverlay from '../components/VipOverlay';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Filter, Zap, Plus, Shirt, CheckCircle2, Video } from 'lucide-react';

const Matching: React.FC = () => {
  const { matches, role, acceptMatch, cancelMatch, myTeam, checkMatchConflict } = useApp();
  const navigate = useNavigate();
  const isVip = role === UserRole.VIP_CAPTAIN;
  const [filterOpen, setFilterOpen] = useState(false);

  const displayMatches = matches.filter(m => m.status === 'open' || (m.status === 'matched' && m.guestTeam?.id === myTeam.id));

  const [selectedMatch, setSelectedMatch] = useState<MatchRequest | null>(null);
  const [conflictMatch, setConflictMatch] = useState<MatchRecord | null>(null);
  const [modalType, setModalType] = useState<'accept' | 'cancel' | null>(null);

  const handleViewDetails = (e: React.MouseEvent, match: MatchRequest) => {
      e.preventDefault();
      e.stopPropagation();

      const conflict = checkMatchConflict(match);
      if (conflict) {
          setConflictMatch(conflict);
          // We don't set modalType here, so the accept modal won't open
          // But we set selectedMatch so we know what we were trying to click
          setSelectedMatch(match);
          return;
      }

      setSelectedMatch(match);
      setModalType('accept');
  };

  const handleCancelClick = (e: React.MouseEvent, match: MatchRequest) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedMatch(match);
      setModalType('cancel');
  };

  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleConfirmAction = () => {
      if (!selectedMatch || !modalType) return;
      
      if (modalType === 'accept') {
          const result = acceptMatch(selectedMatch.id);
          if (result === 'success') {
              setNotification({ type: 'success', message: '应战成功！已从球队账户扣除定金，并加入您的赛程。' });
          } else if (result === 'time_conflict') {
              setNotification({ type: 'error', message: '应战失败！该时段您已有其他比赛安排，请检查赛程。' });
          } else {
              setNotification({ type: 'error', message: '应战失败！球队账户余额不足，请充值。' });
          }
      } else {
          cancelMatch(selectedMatch.id);
          setNotification({ type: 'success', message: '已取消应战，定金已退回球队账户。' });
      }
      setSelectedMatch(null);
      setModalType(null);
      
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
  };

  const getEndTime = (timeStr: string, durationMins: number) => {
    // timeStr e.g. "周四 20:00"
    try {
        const timePart = timeStr.split(' ')[1]; // "20:00"
        if(!timePart) return '';
        
        const [hours, minutes] = timePart.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes + durationMins);
        
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24 relative">
      {notification && (
        <div className={`fixed top-16 left-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white text-center animate-in slide-in-from-top-4 ${notification.type === 'success' ? 'bg-[#07c160]' : 'bg-red-500'}`}>
          {notification.message}
        </div>
      )}
      <NavBar title="约球大厅" />
      
      {/* Search & Filter Header */}
      <div className="bg-white px-4 py-3 sticky top-12 z-30 shadow-sm">
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-100 rounded-lg flex items-center px-3 h-9">
            <span className="text-gray-400 text-sm">🔍 搜索球队/地点</span>
          </div>
          <button 
            className="flex items-center gap-1 text-gray-600 text-sm px-2"
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter size={16} />
            筛选
          </button>
        </div>
        
        {/* Filter Tags */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
            <span className="px-3 py-1 bg-[#07c160]/10 text-[#07c160] text-xs rounded-full whitespace-nowrap font-medium">智能推荐</span>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full whitespace-nowrap">距离最近</span>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full whitespace-nowrap">周四</span>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full whitespace-nowrap">7人制</span>
             {isVip && <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs rounded-full whitespace-nowrap flex items-center gap-1"><Zap size={10} fill="currentColor"/> 信用极好</span>}
        </div>
        
        {/* Advanced Filter Panel (Mock) */}
        {filterOpen && (
            <div className="mt-3 border-t border-gray-100 pt-3 animate-in slide-in-from-top-2">
                <div className="text-xs font-bold text-gray-900 mb-2">高级筛选 (VIP)</div>
                <div className="flex flex-wrap gap-2">
                    <button disabled={!isVip} className={`px-3 py-1 text-xs rounded-full border ${isVip ? 'border-gray-200 text-gray-600' : 'border-gray-100 text-gray-300 bg-gray-50'}`}>
                        只看信用分 90+
                    </button>
                    <button disabled={!isVip} className={`px-3 py-1 text-xs rounded-full border ${isVip ? 'border-gray-200 text-gray-600' : 'border-gray-100 text-gray-300 bg-gray-50'}`}>
                        屏蔽差评球队
                    </button>
                    <button disabled={!isVip} className={`px-3 py-1 text-xs rounded-full border ${isVip ? 'border-gray-200 text-gray-600' : 'border-gray-100 text-gray-300 bg-gray-50'}`}>
                        仅看认证球队
                    </button>
                    {!isVip && <span className="text-xs text-blue-500 flex items-center ml-2" onClick={() => navigate('/vip-subscribe')}>解锁高级筛选 &gt;</span>}
                </div>
            </div>
        )}
      </div>

      {/* Match List */}
      <div className="p-4 space-y-4">
        {!isVip && (
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex justify-between items-center mb-4">
            <div className="text-xs text-blue-800">
              <span className="font-bold block mb-1">升级 VIP 队长</span>
              透视对手战绩、信用分，拒绝“开盲盒”。
            </div>
            <button 
              onClick={() => navigate('/vip-subscribe')}
              className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-sm active:scale-95"
            >
              立即开通
            </button>
          </div>
        )}

        {displayMatches.map((match) => (
          <div key={match.id} className="bg-white rounded-xl p-4 shadow-sm relative overflow-hidden">
             {/* VIP Highlight Border */}
             {isVip && match.hostTeam.creditScore > 90 && (
                <div className="absolute top-0 left-0 w-1 h-full bg-[#07c160]"></div>
             )}
             
            {/* Header: Team Info */}
            <div className="flex justify-between items-start mb-3">
              <Link to={`/team/opponent/${match.hostTeam.id}`} className="flex gap-3 flex-1">
                <img src={match.hostTeam.logo} alt="logo" className="w-12 h-12 rounded-lg object-cover bg-gray-200" />
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    {match.hostTeam.name}
                    {match.hostTeam.isVerified && <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded">V</span>}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span className={`px-1.5 py-0.5 rounded ${match.intensity === '竞技局' ? 'bg-orange-100 text-orange-700' : match.intensity === '激战局' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {match.intensity}
                    </span>
                    {match.genderReq === 'male' && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">仅男足</span>}
                    {match.genderReq === 'female' && <span className="text-xs bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded">仅女足</span>}
                    {match.genderReq === 'any' && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">男女不限</span>}
                    <span>•</span>
                    <span>{match.format}</span>
                  </div>
                </div>
              </Link>
              <div className="text-right">
                <div className="text-lg font-bold text-[#07c160] font-mono">¥{match.totalPrice ? (match.totalPrice / 2) : 0}</div>
                <div className="text-xs text-gray-400">AA/人均</div>
              </div>
            </div>

            {/* Data Grid: The "Paywall" Area */}
            <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-2 mb-4 relative">
              {/* Credit Score */}
              <div className="text-center relative">
                <div className="text-xs text-gray-500 mb-1">信用分</div>
                <div className={`font-bold ${match.hostTeam.creditScore < 80 ? 'text-red-500' : 'text-gray-800'}`}>
                  {match.hostTeam.creditScore}
                </div>
                {!isVip && <VipOverlay label="VIP可见" />}
              </div>
              
              {/* Win Rate */}
              <div className="text-center relative">
                <div className="text-xs text-gray-500 mb-1">胜率(近10)</div>
                <div className="font-bold text-gray-800">{match.hostTeam.winRate}%</div>
                {!isVip && <VipOverlay />}
              </div>

              {/* Tags */}
              <div className="text-center relative">
                <div className="text-xs text-gray-500 mb-1">球风标签</div>
                <div className="text-xs font-medium text-gray-800 truncate px-1">
                   {match.hostTeam.tags[0]}
                </div>
                {!isVip && <VipOverlay />}
              </div>
            </div>

            {/* Info Rows */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={14} />
                <span className="font-bold">
                    {match.date}
                    {match.duration && <span className="text-gray-400 font-normal mx-1">- {getEndTime(match.date, match.duration)} ({match.duration / 60}小时)</span>}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={14} />
                <span>{match.location} <span className="text-xs text-gray-400 ml-1">({match.distance}km)</span></span>
              </div>
              
              {/* Amenities & Jersey */}
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                 <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    <Shirt size={12} />
                    <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: match.jerseyColor }}></div>
                    <span>{match.jerseyColor === '#ffffff' ? '白' : match.jerseyColor === '#000000' ? '黑' : match.jerseyColor === '#ef4444' ? '红' : match.jerseyColor === '#3b82f6' ? '蓝' : '其他'}</span>
                 </div>
                 
                 {/* Explicitly show Referee/Water from cost breakdown if present */}
                 {match.costBreakdown?.refereeFee > 0 && (
                     <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        <CheckCircle2 size={12} className="text-[#07c160]" />
                        <span>有裁判</span>
                     </div>
                 )}
                 {match.costBreakdown?.waterFee > 0 && (
                     <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        <CheckCircle2 size={12} className="text-[#07c160]" />
                        <span>有水</span>
                     </div>
                 )}
                 {match.vas?.videoService && (
                      <div className="flex items-center gap-1 text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                        <Video size={12} />
                        <span>有录像</span>
                     </div>
                 )}

                 {match.amenities?.slice(0, 2).map(item => (
                     <div key={item} className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        <CheckCircle2 size={12} className="text-[#07c160]" />
                        <span>{item}</span>
                     </div>
                 ))}
              </div>
            </div>

            {/* Action Button */}
            {match.status === 'matched' && match.guestTeam?.id === myTeam.id ? (
                <div className="flex gap-2">
                    <button className="flex-1 bg-gray-100 text-gray-500 font-medium py-2.5 rounded-lg cursor-default">
                        已应战
                    </button>
                    <button 
                        onClick={(e) => handleCancelClick(e, match)}
                        className="flex-1 bg-red-50 text-red-600 font-medium py-2.5 rounded-lg active:bg-red-100 transition-colors"
                    >
                        取消应战
                    </button>
                </div>
            ) : (
                <button 
                    onClick={(e) => handleViewDetails(e, match)}
                    className="w-full bg-[#07c160] active:bg-[#06ad56] text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                   <span>查看详情</span>
                </button>
            )}
            <p className="text-[10px] text-center text-gray-400 mt-2">预付定金锁定场地，爽约扣除信用分</p>
          </div>
        ))}
        
        <div className="text-center text-gray-400 text-xs py-4">
            已经到底了
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedMatch && modalType && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedMatch(null); setModalType(null); }}>
              <div className="bg-white rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {modalType === 'accept' ? '确认应战' : '确认取消'}
                  </h3>
                  
                  {modalType === 'accept' ? (
                      <div className="space-y-4">
                          <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                              <div className="flex justify-between text-gray-600">
                                  <span>场地费</span>
                                  <span>¥{selectedMatch.costBreakdown.pitchFee}</span>
                              </div>
                              {selectedMatch.costBreakdown.refereeFee > 0 && (
                                  <div className="flex justify-between text-gray-600">
                                      <span>裁判费</span>
                                      <span>¥{selectedMatch.costBreakdown.refereeFee}</span>
                                  </div>
                              )}
                              {selectedMatch.costBreakdown.waterFee > 0 && (
                                  <div className="flex justify-between text-gray-600">
                                      <span>水费</span>
                                      <span>¥{selectedMatch.costBreakdown.waterFee}</span>
                                  </div>
                              )}
                              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                                  <span>总费用</span>
                                  <span>¥{selectedMatch.totalPrice}</span>
                              </div>
                          </div>
                          
                          <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-100">
                              <span className="text-green-800 font-medium">需预付定金 (50%)</span>
                              <span className="text-xl font-bold text-[#07c160]">¥{selectedMatch.totalPrice / 2}</span>
                          </div>
                          
                          <div className="text-xs text-gray-400 text-center">
                              当前球队余额: ¥{myTeam.fundBalance}
                          </div>
                      </div>
                  ) : (
                      <p className="text-gray-600 mb-6">
                          确定取消应战吗？赛前24小时内取消将扣除信用分。
                      </p>
                  )}

                  <div className="flex gap-3 mt-6">
                      <button 
                          onClick={() => { setSelectedMatch(null); setModalType(null); }}
                          className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium"
                      >
                          取消
                      </button>
                      <button 
                          onClick={handleConfirmAction}
                          className={`flex-1 py-2.5 text-white rounded-lg font-medium ${modalType === 'accept' ? 'bg-[#07c160]' : 'bg-red-500'}`}
                      >
                          {modalType === 'accept' ? '支付定金' : '确定取消'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Conflict Modal */}
      {conflictMatch && selectedMatch && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setConflictMatch(null); setSelectedMatch(null); }}>
              <div className="bg-white rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                  <div className="text-center mb-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Calendar className="text-red-500" size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">时间冲突提醒</h3>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 text-center">
                      该时段您已有比赛安排，无法应战。
                  </p>

                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-4">
                      <div className="text-xs text-gray-400 mb-1">已安排的比赛</div>
                      <div className="flex items-center gap-3">
                          <img src={conflictMatch.opponentLogo} className="w-10 h-10 rounded-full bg-gray-200 object-cover" alt="opponent" />
                          <div>
                              <div className="font-bold text-gray-900 text-sm">{conflictMatch.opponentName}</div>
                              <div className="text-xs text-gray-500">{conflictMatch.date} @ {conflictMatch.location}</div>
                          </div>
                      </div>
                  </div>

                  <button 
                      onClick={() => { setConflictMatch(null); setSelectedMatch(null); }}
                      className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl active:bg-gray-200"
                  >
                      我知道了
                  </button>
              </div>
          </div>
      )}

      {/* Floating Action Button */}
      <Link 
        to="/create-match"
        className="fixed bottom-24 right-6 w-14 h-14 bg-[#07c160] rounded-full shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform z-40"
      >
        <Plus size={32} />
      </Link>
    </div>
  );
};

export default Matching;