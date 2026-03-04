import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { Bot, Search, X, Trash2, MessageSquare, Zap } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Timestamp formatting: 今天 / 昨天 / 周X / raw                      */
/* ------------------------------------------------------------------ */
function formatChatTime(timeStr: string): string {
  // If already a relative term, return as-is
  if (['刚刚', '今天', '昨天'].includes(timeStr)) return timeStr;

  // Attempt to parse HH:MM style times as "today"
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    return `今天 ${timeStr}`;
  }

  // If it's an ISO date or something parseable
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return timeStr;

  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

const ChatList: React.FC = () => {
  const { chats } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const aiChats = chats.filter(c => c.isAi);
  const otherChats = chats.filter(c => !c.isAi);

  // Filtered chats based on search query
  const filteredAiChats = useMemo(() => {
    if (!searchQuery.trim()) return aiChats;
    const q = searchQuery.toLowerCase();
    return aiChats.filter(c => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
  }, [aiChats, searchQuery]);

  const filteredOtherChats = useMemo(() => {
    if (!searchQuery.trim()) return otherChats;
    const q = searchQuery.toLowerCase();
    return otherChats.filter(c => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
  }, [otherChats, searchQuery]);

  const hasNoResults = filteredAiChats.length === 0 && filteredOtherChats.length === 0;
  const hasNoChats = chats.length === 0;

  /* ---------- AI assistant special card ---------- */
  const AiChatItem: React.FC<{ chat: typeof chats[0] }> = ({ chat }) => (
    <div
      key={chat.id}
      className="mx-3 my-2 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/60 active:opacity-80 cursor-pointer transition-all hover:shadow-md"
      onClick={() => navigate(`/chat/${chat.id}`)}
    >
      <div className="flex items-center p-4">
        <div className="relative mr-4 shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg ring-2 ring-white">
            <Bot size={24} />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full p-[3px] ring-2 ring-white">
            <Zap size={10} fill="white" />
          </div>
          {chat.unreadCount > 0 && (
            <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white shadow-sm">
              {chat.unreadCount}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-base text-blue-700 truncate">
              {chat.name}
            </h3>
            <span className="text-[10px] text-blue-400 shrink-0 ml-2">{formatChatTime(chat.lastTime)}</span>
          </div>
          <p className="text-xs text-blue-500/80 truncate">
            {chat.lastMessage}
          </p>
        </div>
      </div>
    </div>
  );

  /* ---------- Regular chat item ---------- */
  const ChatItem: React.FC<{ chat: typeof chats[0] }> = ({ chat }) => (
    <div
      key={chat.id}
      className="flex items-center p-4 border-b border-gray-50 active:bg-gray-50 cursor-pointer hover:bg-gray-50 transition-colors relative group"
      onClick={() => navigate(`/chat/${chat.id}`)}
    >
        <div className="relative mr-4 shrink-0">
            <img src={chat.avatar} className="w-12 h-12 rounded-full bg-gray-200 object-cover border border-gray-100" alt="avatar" />
            {chat.unreadCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white shadow-sm px-1">
                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                </div>
            )}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-base truncate text-gray-900">
                    {chat.name}
                </h3>
                <span className="text-xs text-gray-400 shrink-0 ml-2">{formatChatTime(chat.lastTime)}</span>
            </div>
            <p className="text-sm text-gray-500 truncate">
                {chat.lastMessage}
            </p>
        </div>

        {/* Swipe-to-delete hint (visual only) */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
          <div className="flex items-center gap-1 text-[10px] text-gray-300">
            <Trash2 size={12} />
            <span>左滑删除</span>
          </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <NavBar title="消息" />

      {/* Search bar */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-100 sticky top-12 z-10">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearch(true)}
            placeholder="搜索联系人或消息..."
            className="w-full bg-gray-100 rounded-lg pl-9 pr-8 py-2 text-sm outline-none placeholder-gray-400 focus:ring-2 focus:ring-[#07c160]/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setShowSearch(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Empty state: no chats at all */}
      {hasNoChats && (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
            <MessageSquare size={36} className="text-gray-300" />
          </div>
          <div className="text-base font-medium text-gray-400 mb-2">暂无消息</div>
          <div className="text-sm text-gray-300 mb-6">去约球大厅找对手吧！</div>
          <button
            onClick={() => navigate('/')}
            className="bg-[#07c160] text-white text-sm font-medium px-6 py-2.5 rounded-lg active:scale-[0.98] transition-transform"
          >
            去约球大厅
          </button>
        </div>
      )}

      {!hasNoChats && (
        <>
          {/* AI Assistant Section */}
          {filteredAiChats.length > 0 && (
            <div className="mt-2 bg-white shadow-sm">
                <div className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50/50 uppercase tracking-wider flex items-center gap-1">
                    <Bot size={12} />
                    智能助手
                </div>
                {filteredAiChats.map(chat => <AiChatItem key={chat.id} chat={chat} />)}
            </div>
          )}

          {/* Other Chats Section */}
          <div className="mt-2 bg-white shadow-sm min-h-[50vh]">
              <div className="px-4 py-2 text-xs font-bold text-gray-400 bg-gray-50 uppercase tracking-wider">
                  消息列表
              </div>
              {filteredOtherChats.length > 0 ? (
                filteredOtherChats.map(chat => <ChatItem key={chat.id} chat={chat} />)
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <MessageSquare size={28} className="text-gray-300" />
                  </div>
                  {searchQuery ? (
                    <div className="text-sm text-gray-400">未找到匹配的消息</div>
                  ) : (
                    <>
                      <div className="text-sm text-gray-400 mb-1">暂无消息</div>
                      <div className="text-xs text-gray-300">去约球大厅找对手吧！</div>
                    </>
                  )}
                </div>
              )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChatList;