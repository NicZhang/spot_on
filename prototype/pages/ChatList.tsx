import React from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { Bot } from 'lucide-react';

const ChatList: React.FC = () => {
  const { chats } = useApp();
  const navigate = useNavigate();

  const aiChats = chats.filter(c => c.isAi);
  const otherChats = chats.filter(c => !c.isAi);

  const ChatItem = ({ chat }: { chat: typeof chats[0] }) => (
    <div 
      key={chat.id} 
      className="flex items-center p-4 border-b border-gray-50 active:bg-gray-50 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => navigate(`/chat/${chat.id}`)}
    >
        <div className="relative mr-4">
            {chat.isAi ? (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md ring-2 ring-blue-100">
                    <Bot size={24} />
                </div>
            ) : (
                <img src={chat.avatar} className="w-12 h-12 rounded-full bg-gray-200 object-cover border border-gray-100" alt="avatar" />
            )}
            {chat.unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                    {chat.unreadCount}
                </div>
            )}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
                <h3 className={`font-bold text-base truncate ${chat.isAi ? 'text-blue-600' : 'text-gray-900'}`}>
                    {chat.name}
                </h3>
                <span className="text-xs text-gray-400 shrink-0">{chat.lastTime}</span>
            </div>
            <p className="text-sm text-gray-500 truncate">
                {chat.lastMessage}
            </p>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <NavBar title="消息" />
      
      {/* AI Assistant Section */}
      {aiChats.length > 0 && (
        <div className="mt-2 bg-white shadow-sm">
            <div className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50/50 uppercase tracking-wider flex items-center gap-1">
                <Bot size={12} />
                智能助手
            </div>
            {aiChats.map(chat => <ChatItem key={chat.id} chat={chat} />)}
        </div>
      )}

      {/* Other Chats Section */}
      <div className="mt-2 bg-white shadow-sm min-h-[50vh]">
          <div className="px-4 py-2 text-xs font-bold text-gray-400 bg-gray-50 uppercase tracking-wider">
              消息列表
          </div>
          {otherChats.length > 0 ? (
            otherChats.map(chat => <ChatItem key={chat.id} chat={chat} />)
          ) : (
            <div className="py-12 text-center text-gray-400 text-sm">
                暂无更多消息
            </div>
          )}
      </div>
    </div>
  );
};

export default ChatList;
