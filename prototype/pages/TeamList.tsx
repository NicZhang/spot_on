import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import NavBar from '../components/NavBar';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, MessageCircle, Swords, Users, ShieldCheck, RefreshCw, X, SearchX } from 'lucide-react';
import { Team } from '../types';

const TeamList: React.FC = () => {
  const { opponents, createChat } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('同城推荐');

  // Mock distances for each team
  const teamDistances: Record<string, number> = {
    t2: 5.2,
    t3: 12.5,
    t4: 8.0,
  };

  // Mock member counts for each team
  const teamMemberCounts: Record<string, number> = {
    t2: 22,
    t3: 16,
    t4: 11,
  };

  const filters = ['同城推荐', '活跃球队', '信用极好', '常驻朝阳'];

  const filteredTeams = opponents.filter(team => {
    const matchesSearch =
      !searchTerm ||
      team.name.includes(searchTerm) ||
      team.location.includes(searchTerm) ||
      team.tags.some(tag => tag.includes(searchTerm));

    if (!matchesSearch) return false;

    if (activeFilter === '信用极好') return team.creditScore >= 90;
    if (activeFilter === '常驻朝阳') return team.location.includes('朝阳') || team.location.includes('奥体');

    return true;
  });

  const handleChallenge = (teamId: string) => {
    navigate('/create-match');
  };

  const handleContact = (team: Team) => {
    const chatId = createChat(team.id, `${team.name}队长`, team.logo);
    navigate(`/chat/${chatId}`);
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
  }, []);

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24 relative">
      <NavBar title="找球队" />

      {/* Search Header */}
      <div className="bg-white px-4 py-3 sticky top-12 z-30 shadow-sm">
        <div className="bg-gray-100 rounded-lg flex items-center px-3 h-9">
          <Search size={16} className="text-gray-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索球队名称 / 地点 / 标签"
            className="bg-transparent flex-1 text-sm outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={clearSearch} className="p-1 text-gray-400 active:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium transition-colors ${
                activeFilter === filter
                  ? 'bg-[#07c160]/10 text-[#07c160]'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Pull to Refresh Bar */}
      <div className="px-4 pt-3">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-400 active:text-gray-500 disabled:opacity-50"
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? '刷新中...' : '下拉刷新'}</span>
        </button>
      </div>

      {/* Team List */}
      <div className="px-4 space-y-4 pb-4">
        {filteredTeams.map(team => {
          const distance = teamDistances[team.id] ?? Math.round(Math.random() * 15 * 10) / 10;
          const memberCount = teamMemberCounts[team.id] ?? 15;

          return (
            <div key={team.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex gap-4">
                <Link to={`/team/opponent/${team.id}`} className="shrink-0">
                  <img
                    src={team.logo}
                    alt={team.name}
                    className="w-16 h-16 rounded-lg object-cover bg-gray-200"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link to={`/team/opponent/${team.id}`}>
                        <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
                          {team.name}
                          {team.isVerified && (
                            <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full border border-blue-100">
                              <ShieldCheck size={10} />
                              已认证
                            </span>
                          )}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-0.5">
                          <MapPin size={11} />
                          {distance}km
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Users size={11} />
                          {memberCount}人
                        </span>
                        <span>{team.location}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div
                        className={`text-lg font-bold ${
                          team.creditScore >= 90
                            ? 'text-[#07c160]'
                            : team.creditScore >= 60
                            ? 'text-orange-500'
                            : 'text-red-500'
                        }`}
                      >
                        {team.creditScore}
                      </div>
                      <div className="text-[10px] text-gray-400">信用分</div>
                    </div>
                  </div>

                  {/* Win rate bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#07c160] rounded-full transition-all"
                        style={{ width: `${team.winRate}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium w-10 text-right">胜率{team.winRate}%</span>
                  </div>

                  <div className="flex gap-1 mt-2 flex-wrap">
                    {team.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleContact(team)}
                      className="flex-1 bg-gray-50 text-gray-600 text-xs font-medium py-1.5 rounded-lg flex items-center justify-center gap-1 active:bg-gray-100 border border-gray-100"
                    >
                      <MessageCircle size={12} />
                      联系队长
                    </button>
                    <button
                      onClick={() => handleChallenge(team.id)}
                      className="flex-1 bg-[#07c160] text-white text-xs font-medium py-1.5 rounded-lg flex items-center justify-center gap-1 active:bg-[#06ad56]"
                    >
                      <Swords size={12} />
                      约战
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredTeams.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-8">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <SearchX size={32} className="text-gray-300" />
            </div>
            <h4 className="text-gray-600 font-bold mb-1">未找到相关球队</h4>
            <p className="text-gray-400 text-sm text-center mb-4">
              {searchTerm
                ? `没有找到包含"${searchTerm}"的球队，换个关键词试试`
                : '当前筛选条件下没有球队，尝试其他筛选'}
            </p>
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="px-4 py-2 bg-[#07c160]/10 text-[#07c160] text-sm rounded-lg font-medium active:bg-[#07c160]/20"
              >
                清除搜索
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamList;
