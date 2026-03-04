import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, MatchRequest, MatchRecord } from '../types';
import NavBar from '../components/NavBar';
import VipOverlay from '../components/VipOverlay';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Calendar, Filter, Zap, Plus, Shirt,
  CheckCircle2, Video, X, Search, RefreshCw,
  Clock, Users, AlertTriangle, ChevronRight
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Inline Toast component
// ---------------------------------------------------------------------------
interface ToastData {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const Toast: React.FC<{ toast: ToastData; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`
        fixed top-14 left-4 right-4 z-[60] px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium text-center
        transition-all duration-300 ease-out
        animate-[slideDown_0.3s_ease-out]
        ${toast.type === 'success' ? 'bg-[#07c160]' : 'bg-red-500'}
      `}
      style={{ animation: 'slideDown 0.3s ease-out' }}
    >
      {toast.message}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Skeleton card for loading state
// ---------------------------------------------------------------------------
const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
    <div className="flex gap-3 mb-4">
      <div className="w-12 h-12 rounded-lg bg-gray-200" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-28 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-40" />
      </div>
      <div className="text-right">
        <div className="h-5 bg-gray-200 rounded w-14 mb-1 ml-auto" />
        <div className="h-3 bg-gray-200 rounded w-10 ml-auto" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 mb-4">
      <div className="h-4 bg-gray-200 rounded" />
      <div className="h-4 bg-gray-200 rounded" />
      <div className="h-4 bg-gray-200 rounded" />
      <div className="h-4 bg-gray-200 rounded" />
    </div>
    <div className="flex gap-2 mb-4">
      <div className="h-7 bg-gray-200 rounded-full w-16" />
      <div className="h-7 bg-gray-200 rounded-full w-16" />
      <div className="h-7 bg-gray-200 rounded-full w-16" />
    </div>
    <div className="h-10 bg-gray-200 rounded-lg" />
  </div>
);

// ---------------------------------------------------------------------------
// Intensity helpers
// ---------------------------------------------------------------------------
const intensityBorderColor = (intensity: string): string => {
  switch (intensity) {
    case '养生局': return '#22c55e';
    case '竞技局': return '#f97316';
    case '激战局': return '#ef4444';
    default: return '#d1d5db';
  }
};

const intensityChipClass = (intensity: string): string => {
  switch (intensity) {
    case '养生局': return 'bg-green-100 text-green-700';
    case '竞技局': return 'bg-orange-100 text-orange-700';
    case '激战局': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const jerseyLabel = (color: string): string => {
  const map: Record<string, string> = {
    '#ffffff': '白', '#000000': '黑', '#ef4444': '红',
    '#3b82f6': '蓝', '#22c55e': '绿', '#eab308': '黄',
  };
  return map[color] || '其他';
};

// ---------------------------------------------------------------------------
// Filter chip definitions
// ---------------------------------------------------------------------------
interface FilterChip {
  key: string;
  label: string;
  group: 'sort' | 'format' | 'intensity' | 'time' | 'vip';
  vipOnly?: boolean;
}

const FILTER_CHIPS: FilterChip[] = [
  { key: 'recommend', label: '智能推荐', group: 'sort' },
  { key: 'nearest', label: '距离最近', group: 'sort' },
  { key: '5v5', label: '5人制', group: 'format' },
  { key: '7v7', label: '7人制', group: 'format' },
  { key: '8v8', label: '8人制', group: 'format' },
  { key: '11v11', label: '11人制', group: 'format' },
  { key: 'yangsheng', label: '养生局', group: 'intensity' },
  { key: 'jingji', label: '竞技局', group: 'intensity' },
  { key: 'jizhan', label: '激战局', group: 'intensity' },
  { key: 'today', label: '今天', group: 'time' },
  { key: 'tomorrow', label: '明天', group: 'time' },
  { key: 'thisweek', label: '本周', group: 'time' },
  { key: 'highcredit', label: '信用极好', group: 'vip', vipOnly: true },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const Matching: React.FC = () => {
  const { matches, role, acceptMatch, cancelMatch, myTeam, checkMatchConflict } = useApp();
  const navigate = useNavigate();
  const isVip = role === UserRole.VIP_CAPTAIN;

  // -- Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // -- Filter state
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(['recommend']));
  const [filterOpen, setFilterOpen] = useState(false);

  // -- Modal state
  const [selectedMatch, setSelectedMatch] = useState<MatchRequest | null>(null);
  const [conflictMatch, setConflictMatch] = useState<MatchRecord | null>(null);
  const [modalType, setModalType] = useState<'accept' | 'cancel' | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [conflictModalVisible, setConflictModalVisible] = useState(false);

  // -- Toast state
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastId = useRef(0);

  // -- Loading state
  const [isLoading, setIsLoading] = useState(true);

  // -- Pull-to-refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // -- FAB label visibility
  const [showFabLabel, setShowFabLabel] = useState(true);

  // -- Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // -- Initial loading simulation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // -- Hide FAB label after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowFabLabel(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // -- Toast helper
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // -- Filter chip toggle
  const toggleFilter = useCallback((key: string, chip: FilterChip) => {
    if (chip.vipOnly && !isVip) {
      navigate('/vip-subscribe');
      return;
    }
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        // Remove other chips in same group (single-select per group, except format)
        if (chip.group === 'sort') {
          FILTER_CHIPS.filter(c => c.group === 'sort').forEach(c => next.delete(c.key));
        }
        if (chip.group === 'time') {
          FILTER_CHIPS.filter(c => c.group === 'time').forEach(c => next.delete(c.key));
        }
        if (chip.group === 'intensity') {
          FILTER_CHIPS.filter(c => c.group === 'intensity').forEach(c => next.delete(c.key));
        }
        next.add(key);
      }
      return next;
    });
  }, [isVip, navigate]);

  // -- Filtered + searched matches
  const displayMatches = useMemo(() => {
    let result = matches.filter(
      m => m.status === 'open' || (m.status === 'matched' && m.guestTeam?.id === myTeam.id)
    );

    // Apply search
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.trim().toLowerCase();
      result = result.filter(
        m =>
          m.hostTeam.name.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q)
      );
    }

    // Apply format filters
    const formatFilters = ['5v5', '7v7', '8v8', '11v11'].filter(f => activeFilters.has(f));
    if (formatFilters.length > 0) {
      const formatMap: Record<string, string> = {
        '5v5': '5人制', '7v7': '7人制', '8v8': '8人制', '11v11': '11人制',
      };
      const allowedFormats = formatFilters.map(f => formatMap[f]);
      result = result.filter(m => allowedFormats.includes(m.format));
    }

    // Apply intensity filter
    const intensityMap: Record<string, string> = {
      yangsheng: '养生局', jingji: '竞技局', jizhan: '激战局',
    };
    for (const [key, value] of Object.entries(intensityMap)) {
      if (activeFilters.has(key)) {
        result = result.filter(m => m.intensity === value);
      }
    }

    // Apply time filter (simple string matching on date display)
    if (activeFilters.has('today')) {
      result = result.filter(m => m.date.includes('今天') || m.date.includes('今日'));
    }
    if (activeFilters.has('tomorrow')) {
      result = result.filter(m => m.date.includes('明天') || m.date.includes('明日'));
    }
    // "thisweek" keeps everything (all mock data is this week)

    // Sort
    if (activeFilters.has('nearest')) {
      result = [...result].sort((a, b) => a.distance - b.distance);
    }

    return result;
  }, [matches, debouncedQuery, activeFilters, myTeam.id]);

  // -- Pull to refresh handler
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollTop <= 0 && !isRefreshing) {
      setIsRefreshing(true);
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  }, [isRefreshing]);

  // -- Match helpers
  const getEndTime = (timeStr: string, durationMins: number): string => {
    try {
      const timePart = timeStr.split(' ')[1];
      if (!timePart) return '';
      const [hours, minutes] = timePart.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes + durationMins);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  // -- Modal open helpers with animation
  const openAcceptModal = (match: MatchRequest) => {
    const conflict = checkMatchConflict(match);
    if (conflict) {
      setConflictMatch(conflict);
      setSelectedMatch(match);
      setTimeout(() => setConflictModalVisible(true), 10);
      return;
    }
    setSelectedMatch(match);
    setModalType('accept');
    setTimeout(() => setModalVisible(true), 10);
  };

  const openCancelModal = (match: MatchRequest) => {
    setSelectedMatch(match);
    setModalType('cancel');
    setTimeout(() => setModalVisible(true), 10);
  };

  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => {
      setSelectedMatch(null);
      setModalType(null);
    }, 300);
  };

  const closeConflictModal = () => {
    setConflictModalVisible(false);
    setTimeout(() => {
      setConflictMatch(null);
      setSelectedMatch(null);
    }, 300);
  };

  const handleConfirmAction = () => {
    if (!selectedMatch || !modalType) return;

    if (modalType === 'accept') {
      const result = acceptMatch(selectedMatch.id);
      if (result === 'success') {
        showToast('success', '应战成功！已从球队账户扣除定金，并加入您的赛程。');
      } else if (result === 'time_conflict') {
        showToast('error', '应战失败！该时段您已有其他比赛安排，请检查赛程。');
      } else {
        showToast('error', '应战失败！球队账户余额不足，请充值。');
      }
    } else {
      cancelMatch(selectedMatch.id);
      showToast('success', '已取消应战，定金已退回球队账户。');
    }

    closeModal();
  };

  // -- Event handlers that stop propagation
  const handleViewDetails = (e: React.MouseEvent, match: MatchRequest) => {
    e.preventDefault();
    e.stopPropagation();
    openAcceptModal(match);
  };

  const handleCancelClick = (e: React.MouseEvent, match: MatchRequest) => {
    e.preventDefault();
    e.stopPropagation();
    openCancelModal(match);
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-32 relative">
      {/* Slide-down animation keyframes */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Toasts */}
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={dismissToast} />
      ))}

      <NavBar title="约球大厅" />

      {/* ----------------------------------------------------------------- */}
      {/* Search & Filter Header                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white px-4 py-3 sticky top-12 z-30 shadow-sm">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-100 rounded-lg flex items-center px-3 h-9 focus-within:ring-2 focus-within:ring-[#07c160]/40 transition-shadow">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索球队/地点"
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none ml-2"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}
                className="text-gray-400 active:text-gray-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            className={`flex items-center gap-1 text-sm px-2 rounded-lg transition-colors ${filterOpen ? 'text-[#07c160] bg-[#07c160]/10' : 'text-gray-600'}`}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter size={16} />
            筛选
          </button>
        </div>

        {/* Result count when searching */}
        {debouncedQuery.trim() && !isLoading && (
          <div className="mt-2 text-xs text-gray-500">
            找到 <span className="font-bold text-gray-800">{displayMatches.length}</span> 个相关约球
          </div>
        )}

        {/* Horizontal scrollable filter chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-0.5">
          {FILTER_CHIPS.map(chip => {
            if (chip.vipOnly && !isVip) {
              return (
                <button
                  key={chip.key}
                  onClick={() => toggleFilter(chip.key, chip)}
                  className="px-3 py-1 bg-amber-50 text-amber-600 text-xs rounded-full whitespace-nowrap flex items-center gap-1 border border-amber-200"
                >
                  <Zap size={10} fill="currentColor" />
                  {chip.label}
                </button>
              );
            }
            const isActive = activeFilters.has(chip.key);
            return (
              <button
                key={chip.key}
                onClick={() => toggleFilter(chip.key, chip)}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium transition-colors ${
                  isActive
                    ? 'bg-[#07c160] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Advanced VIP filter panel */}
        {filterOpen && (
          <div className="mt-3 border-t border-gray-100 pt-3" style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <div className="text-xs font-bold text-gray-900 mb-2">高级筛选 (VIP)</div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={!isVip}
                className={`px-3 py-1 text-xs rounded-full border ${isVip ? 'border-gray-200 text-gray-600 active:bg-gray-100' : 'border-gray-100 text-gray-300 bg-gray-50'}`}
              >
                只看信用分 90+
              </button>
              <button
                disabled={!isVip}
                className={`px-3 py-1 text-xs rounded-full border ${isVip ? 'border-gray-200 text-gray-600 active:bg-gray-100' : 'border-gray-100 text-gray-300 bg-gray-50'}`}
              >
                屏蔽差评球队
              </button>
              <button
                disabled={!isVip}
                className={`px-3 py-1 text-xs rounded-full border ${isVip ? 'border-gray-200 text-gray-600 active:bg-gray-100' : 'border-gray-100 text-gray-300 bg-gray-50'}`}
              >
                仅看认证球队
              </button>
              {!isVip && (
                <span
                  className="text-xs text-blue-500 flex items-center ml-2 cursor-pointer"
                  onClick={() => navigate('/vip-subscribe')}
                >
                  解锁高级筛选 <ChevronRight size={12} />
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Pull-to-refresh indicator                                         */}
      {/* ----------------------------------------------------------------- */}
      {isRefreshing && (
        <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-400">
          <RefreshCw size={14} className="animate-spin" />
          刷新中...
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Match list                                                         */}
      {/* ----------------------------------------------------------------- */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="p-4 space-y-4"
      >
        {/* VIP upsell banner */}
        {!isVip && !isLoading && (
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex justify-between items-center">
            <div className="text-xs text-blue-800">
              <span className="font-bold block mb-1">升级 VIP 队长</span>
              透视对手战绩、信用分，拒绝"开盲盒"。
            </div>
            <button
              onClick={() => navigate('/vip-subscribe')}
              className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-sm active:scale-95 transition-transform shrink-0"
            >
              立即开通
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {/* Empty state */}
        {!isLoading && displayMatches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm mb-1">暂无符合条件的约球</p>
            <p className="text-gray-400 text-xs mb-4">试试更换搜索词或筛选条件</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveFilters(new Set(['recommend']));
              }}
              className="px-4 py-2 bg-[#07c160] text-white text-sm rounded-full font-medium active:scale-95 transition-transform"
            >
              调整筛选条件
            </button>
          </div>
        )}

        {/* Match cards */}
        {!isLoading &&
          displayMatches.map(match => (
            <div
              key={match.id}
              className="bg-white rounded-xl shadow-sm relative overflow-hidden"
              style={{ borderLeft: `3px solid ${intensityBorderColor(match.intensity)}` }}
            >
              {/* ---- Top section: Team + Price ---- */}
              <div className="flex justify-between items-start p-4 pb-0">
                <Link to={`/team/opponent/${match.hostTeam.id}`} className="flex gap-3 flex-1 min-w-0">
                  <img
                    src={match.hostTeam.logo}
                    alt="logo"
                    className="w-11 h-11 rounded-lg object-cover bg-gray-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 truncate">
                      {match.hostTeam.name}
                      {match.hostTeam.isVerified && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded shrink-0">V</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${intensityChipClass(match.intensity)}`}>
                        {match.intensity}
                      </span>
                      {match.genderReq === 'male' && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">仅男足</span>
                      )}
                      {match.genderReq === 'female' && (
                        <span className="text-[10px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded">仅女足</span>
                      )}
                      {match.genderReq === 'any' && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">男女不限</span>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-lg font-bold text-[#07c160] font-mono leading-none">
                    ¥{match.totalPrice / 2}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">/队</div>
                </div>
              </div>

              {/* ---- Middle section: Info grid ---- */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 pt-3 pb-2 text-sm">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Calendar size={13} className="text-gray-400 shrink-0" />
                  <span className="font-medium truncate">
                    {match.date}
                    {match.duration && (
                      <span className="text-gray-400 font-normal text-xs ml-1">
                        - {getEndTime(match.date, match.duration)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Users size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate">{match.format}</span>
                  {match.duration && (
                    <span className="text-gray-400 text-xs">({match.duration / 60}h)</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
                  <MapPin size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate">{match.location}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">({match.distance}km)</span>
                </div>
              </div>

              {/* ---- VIP data section: horizontal row ---- */}
              <div className="mx-4 mb-3 bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-4 relative">
                {/* Credit score */}
                <div className="flex items-center gap-1.5 relative">
                  <span className="text-[10px] text-gray-400">信用</span>
                  <span className={`text-sm font-bold ${match.hostTeam.creditScore < 80 ? 'text-red-500' : 'text-gray-800'}`}>
                    {match.hostTeam.creditScore}
                  </span>
                  {!isVip && <VipOverlay label="VIP" />}
                </div>
                <div className="w-px h-4 bg-gray-200" />
                {/* Win rate */}
                <div className="flex items-center gap-1.5 relative">
                  <span className="text-[10px] text-gray-400">胜率</span>
                  <span className="text-sm font-bold text-gray-800">{match.hostTeam.winRate}%</span>
                  {!isVip && <VipOverlay />}
                </div>
                <div className="w-px h-4 bg-gray-200" />
                {/* Tags */}
                <div className="flex items-center gap-1.5 relative min-w-0">
                  <span className="text-[10px] text-gray-400 shrink-0">球风</span>
                  <span className="text-xs font-medium text-gray-800 truncate">
                    {match.hostTeam.tags.slice(0, 2).join(' / ')}
                  </span>
                  {!isVip && <VipOverlay />}
                </div>
              </div>

              {/* ---- Amenities chips ---- */}
              <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  <Shirt size={11} />
                  <div
                    className="w-2.5 h-2.5 rounded-full border border-black/10"
                    style={{ backgroundColor: match.jerseyColor }}
                  />
                  <span>{jerseyLabel(match.jerseyColor)}</span>
                </div>

                {match.costBreakdown?.refereeFee > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    <CheckCircle2 size={11} className="text-[#07c160]" />
                    <span>有裁判</span>
                  </div>
                )}
                {match.costBreakdown?.waterFee > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    <CheckCircle2 size={11} className="text-[#07c160]" />
                    <span>有水</span>
                  </div>
                )}
                {match.vas?.videoService && (
                  <div className="flex items-center gap-1 text-[10px] text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                    <Video size={11} />
                    <span>有录像</span>
                  </div>
                )}
                {match.amenities?.slice(0, 2).map(item => (
                  <div
                    key={item}
                    className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded-full"
                  >
                    <CheckCircle2 size={11} className="text-[#07c160]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* ---- Action button ---- */}
              <div className="px-4 pb-3">
                {match.status === 'matched' && match.guestTeam?.id === myTeam.id ? (
                  <div className="flex gap-2">
                    <button className="flex-1 bg-gray-100 text-gray-500 font-medium py-2.5 rounded-lg cursor-default text-sm">
                      已应战
                    </button>
                    <button
                      onClick={e => handleCancelClick(e, match)}
                      className="flex-1 bg-red-50 text-red-600 font-medium py-2.5 rounded-lg active:bg-red-100 transition-colors text-sm"
                    >
                      取消应战
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={e => handleViewDetails(e, match)}
                    className="w-full bg-[#07c160] active:bg-[#06ad56] text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
                  >
                    <span>查看详情</span>
                  </button>
                )}
                <p className="text-[10px] text-center text-gray-400 mt-1.5">
                  预付定金锁定场地，爽约扣除信用分
                </p>
              </div>
            </div>
          ))}

        {/* Bottom text */}
        {!isLoading && displayMatches.length > 0 && (
          <div className="text-center text-gray-400 text-xs py-4">已经到底了</div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Accept / Cancel modal (action sheet style, slides up)             */}
      {/* ----------------------------------------------------------------- */}
      {selectedMatch && modalType && (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center transition-all duration-300 ${
            modalVisible ? 'bg-black/50' : 'bg-black/0 pointer-events-none'
          }`}
          onClick={closeModal}
        >
          <div
            className={`bg-white rounded-t-2xl w-full max-w-lg transition-transform duration-300 ease-out ${
              modalVisible ? 'translate-y-0' : 'translate-y-full'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="px-6 pb-8 pt-2">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {modalType === 'accept' ? '确认应战' : '确认取消'}
              </h3>

              {modalType === 'accept' ? (
                <div className="space-y-4">
                  {/* Match summary card */}
                  <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-100">
                    <img
                      src={selectedMatch.hostTeam.logo}
                      alt="logo"
                      className="w-10 h-10 rounded-lg object-cover bg-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-gray-900 truncate">
                        {selectedMatch.hostTeam.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {selectedMatch.date} | {selectedMatch.location} | {selectedMatch.format}
                      </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${intensityChipClass(selectedMatch.intensity)}`}>
                      {selectedMatch.intensity}
                    </span>
                  </div>

                  {/* Cost breakdown */}
                  <div className="bg-gray-50 p-3 rounded-xl space-y-2 text-sm border border-gray-100">
                    <div className="flex justify-between text-gray-600">
                      <span>场地费</span>
                      <span className="font-mono">¥{selectedMatch.costBreakdown.pitchFee}</span>
                    </div>
                    {selectedMatch.costBreakdown.refereeFee > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>裁判费</span>
                        <span className="font-mono">¥{selectedMatch.costBreakdown.refereeFee}</span>
                      </div>
                    )}
                    {selectedMatch.costBreakdown.waterFee > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>水费</span>
                        <span className="font-mono">¥{selectedMatch.costBreakdown.waterFee}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                      <span>总费用</span>
                      <span className="font-mono">¥{selectedMatch.totalPrice}</span>
                    </div>
                  </div>

                  {/* Deposit info */}
                  <div className="flex justify-between items-center bg-green-50 p-3 rounded-xl border border-green-100">
                    <span className="text-green-800 font-medium text-sm">需预付定金 (50%)</span>
                    <span className="text-xl font-bold text-[#07c160] font-mono">
                      ¥{selectedMatch.totalPrice / 2}
                    </span>
                  </div>

                  <div className="text-xs text-gray-400 text-center">
                    当前球队余额: ¥{myTeam.fundBalance}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3 border border-red-100">
                    <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-800 font-medium">确定取消应战吗？</p>
                      <p className="text-xs text-gray-500 mt-1">
                        赛前24小时内取消将扣除信用分。定金将退回球队账户。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeModal}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium active:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmAction}
                  className={`flex-1 py-3 text-white rounded-xl font-medium active:scale-[0.98] transition-all ${
                    modalType === 'accept' ? 'bg-[#07c160]' : 'bg-red-500'
                  }`}
                >
                  {modalType === 'accept' ? '支付定金' : '确定取消'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Conflict modal with timeline                                      */}
      {/* ----------------------------------------------------------------- */}
      {conflictMatch && selectedMatch && (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center transition-all duration-300 ${
            conflictModalVisible ? 'bg-black/50' : 'bg-black/0 pointer-events-none'
          }`}
          onClick={closeConflictModal}
        >
          <div
            className={`bg-white rounded-t-2xl w-full max-w-lg transition-transform duration-300 ease-out ${
              conflictModalVisible ? 'translate-y-0' : 'translate-y-full'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="px-6 pb-8 pt-2">
              <div className="text-center mb-5">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="text-red-500" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">时间冲突提醒</h3>
                <p className="text-gray-500 text-xs mt-1">该时段您已有比赛安排，无法应战</p>
              </div>

              {/* Timeline conflict visualization */}
              <div className="relative pl-6 space-y-0 mb-6">
                {/* Timeline line */}
                <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-red-200" />

                {/* Existing match */}
                <div className="relative pb-4">
                  <div className="absolute left-[-18px] top-1 w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100" />
                  <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                    <div className="text-[10px] text-red-500 font-medium mb-1">已安排</div>
                    <div className="flex items-center gap-2">
                      <img
                        src={conflictMatch.opponentLogo}
                        className="w-8 h-8 rounded-lg bg-gray-200 object-cover"
                        alt="opponent"
                      />
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{conflictMatch.opponentName}</div>
                        <div className="text-[10px] text-gray-500">
                          {conflictMatch.date} @ {conflictMatch.location}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attempted match */}
                <div className="relative">
                  <div className="absolute left-[-18px] top-1 w-3 h-3 rounded-full bg-gray-300 ring-4 ring-gray-100" />
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 opacity-60">
                    <div className="text-[10px] text-gray-400 font-medium mb-1">冲突约球</div>
                    <div className="flex items-center gap-2">
                      <img
                        src={selectedMatch.hostTeam.logo}
                        className="w-8 h-8 rounded-lg bg-gray-200 object-cover"
                        alt="host"
                      />
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{selectedMatch.hostTeam.name}</div>
                        <div className="text-[10px] text-gray-500">
                          {selectedMatch.date} @ {selectedMatch.location}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={closeConflictModal}
                className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl active:bg-gray-200 transition-colors"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Floating Action Button with label                                 */}
      {/* ----------------------------------------------------------------- */}
      <Link
        to="/create-match"
        className="fixed bottom-24 right-5 z-40 flex items-center gap-2 group"
      >
        {showFabLabel && (
          <span
            className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap"
            style={{ animation: 'fadeIn 0.3s ease-out' }}
          >
            发起约球
          </span>
        )}
        <div className="w-14 h-14 bg-[#07c160] rounded-full shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform">
          <Plus size={28} />
        </div>
      </Link>
    </div>
  );
};

export default Matching;
