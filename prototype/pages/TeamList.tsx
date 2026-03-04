import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import NavBar from '../components/NavBar';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, MessageCircle, Swords, Star } from 'lucide-react';

const TeamList: React.FC = () => {
  const { opponents, createChat } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTeams = opponents.filter(team => 
    team.name.includes(searchTerm) || 
    team.location.includes(searchTerm) ||
    team.tags.some(tag => tag.includes(searchTerm))
  );

  const handleChallenge = (teamId: string) => {
      // Navigate to create match with pre-filled opponent (mock for now)
      navigate('/create-match'); 
  };

  const handleContact = (team: any) => {
      const chatId = createChat(team.id, `${team.name}队长`, team.logo);
      navigate(`/chat/${chatId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24 relative">
      <NavBar title="找球队" />
      
      {/* Search Header */}
      <div className="bg-white px-4 py-3 sticky top-12 z-30 shadow-sm">
        <div className="bg-gray-100 rounded-lg flex items-center px-3 h-9">
          <Search size={16} className="text-gray-400 mr-2" />
          <input 
            type="text"
            placeholder="搜索球队名称 / 地点 / 标签"
            className="bg-transparent flex-1 text-sm outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Quick Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
            <span className="px-3 py-1 bg-[#07c160]/10 text-[#07c160] text-xs rounded-full whitespace-nowrap font-medium">同城推荐</span>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full whitespace-nowrap">活跃球队</span>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full whitespace-nowrap">信用极好</span>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full whitespace-nowrap">常驻朝阳</span>
        </div>
      </div>

      {/* Team List */}
      <div className="p-4 space-y-4">
        {filteredTeams.map((team) => (
          <div key={team.id} className="bg-white rounded-xl p-4 shadow-sm flex gap-4">
            <Link to={`/team/opponent/${team.id}`} className="shrink-0">
                <img src={team.logo} alt={team.name} className="w-16 h-16 rounded-lg object-cover bg-gray-200" />
            </Link>
            
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-gray-900 flex items-center gap-1">
                            {team.name}
                            {team.isVerified && <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded">V</span>}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <MapPin size={12} />
                            <span>{team.location}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`text-lg font-bold ${team.creditScore >= 90 ? 'text-[#07c160]' : 'text-orange-500'}`}>
                            {team.creditScore}
                        </div>
                        <div className="text-[10px] text-gray-400">信用分</div>
                    </div>
                </div>

                <div className="flex gap-1 mt-2 flex-wrap">
                    {team.tags.map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="flex gap-2 mt-3">
                    <button 
                        onClick={() => handleContact(team)}
                        className="flex-1 bg-gray-50 text-gray-600 text-xs font-medium py-1.5 rounded flex items-center justify-center gap-1 active:bg-gray-100"
                    >
                        <MessageCircle size={12} />
                        联系队长
                    </button>
                    <button 
                        onClick={() => handleChallenge(team.id)}
                        className="flex-1 bg-[#07c160] text-white text-xs font-medium py-1.5 rounded flex items-center justify-center gap-1 active:bg-[#06ad56]"
                    >
                        <Swords size={12} />
                        约战
                    </button>
                </div>
            </div>
          </div>
        ))}
        
        {filteredTeams.length === 0 && (
            <div className="text-center text-gray-400 py-8 text-sm">
                未找到相关球队
            </div>
        )}
      </div>
    </div>
  );
};

export default TeamList;
