import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { Send, Image, ChevronLeft, Bot, User, MapPin, Calendar, Trophy, ArrowRight } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

/* ------------------------------------------------------------------ */
/*  Typing indicator with three bouncing dots                          */
/* ------------------------------------------------------------------ */
const TypingIndicator: React.FC = () => (
  <div className="flex w-full justify-start">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-sm mr-2 shrink-0 self-start mt-1">
      <Bot size={16} />
    </div>
    <div className="bg-white text-gray-500 rounded-2xl rounded-tl-none px-5 py-3 shadow-sm flex items-center gap-1.5">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '600ms' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '600ms' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '600ms' }}></div>
    </div>
  </div>
);

const ChatDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { chats, addChatMessage, opponents, matches } = useApp();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const chat = chats.find(c => c.id === id);
  const isAi = chat?.isAi;

  const scrollToBottom = () => {
    // Use a small timeout to ensure DOM has updated before scrolling
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages?.length]);

  if (!chat) return <div className="p-4 text-center text-gray-500">未找到聊天记录</div>;

  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
      if (!input.trim()) return;

      const userMsg = input.trim();
      addChatMessage(chat.id, userMsg, 'me');
      setInput('');

      if (isAi) {
          setIsTyping(true);

          // Get last AI message for context
          const aiMessages = chat.messages.filter(m => m.senderId === 'ai');
          const lastAiMsg = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].text : '';

          setTimeout(async () => {
              try {
                  let aiResponseText = "我还在学习中，请稍后再试。";
                  let cardType: 'text' | 'card' = 'text';
                  let cardData = null;

                  // 1. Handle Number Replies based on Context
                  if (userMsg === '1' || userMsg === '2') {
                      if (lastAiMsg.includes('推荐以下活跃球队')) {
                          const teamId = userMsg === '1' ? 't2' : 't3';
                          const team = opponents.find(t => t.id === teamId);
                          if (team) {
                              aiResponseText = "为您展示球队详情：";
                              cardType = 'card';
                              cardData = { type: 'team', data: team };
                          }
                      } else if (lastAiMsg.includes('找到一场合适的比赛')) {
                          const matchId = 'm1';
                          const match = matches.find(m => m.id === matchId);
                          if (match) {
                              aiResponseText = "为您展示比赛详情：";
                              cardType = 'card';
                              cardData = { type: 'match', data: match };
                          }
                      }
                  }

                  // 2. Handle Keywords
                  else if (userMsg.includes('推荐') && userMsg.includes('球队')) {
                      aiResponseText = "为您推荐以下活跃球队：\n\n1. 皇家体校队 (胜率90%)\n2. 周四养生局 (球风干净)\n\n回复对应序号 (1 或 2) 查看详情卡片。";
                  } else if (userMsg.includes('约') || userMsg.includes('比赛')) {
                      aiResponseText = "帮您找到一场合适的比赛：\n\n1. 周四 20:00 vs 皇家体校队 @奥体中心\n\n回复 1 查看详情卡片。";
                  }

                  // 3. Fallback to Gemini
                  else {
                      if (process.env.GEMINI_API_KEY) {
                          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                          const response = await ai.models.generateContent({
                              model: "gemini-3-flash-preview",
                              contents: userMsg,
                          });
                          aiResponseText = response.text || "抱歉，我暂时无法回答。";
                      } else {
                          aiResponseText = '收到您的消息！作为一个足球助手，我可以帮您找球队、约比赛。试试发送\u201C推荐球队\u201D或\u201C我要约球\u201D。';
                      }
                  }

                  addChatMessage(chat.id, aiResponseText, 'ai', cardType, cardData);

              } catch (e) {
                  console.error(e);
                  addChatMessage(chat.id, "抱歉，我遇到了一些问题，请稍后再试。", 'ai');
              } finally {
                  setIsTyping(false);
              }
          }, 1000);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = input.trim().length > 0;

  return (
    <div className="flex flex-col h-screen bg-[#ededed]">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center shadow-sm z-10 sticky top-0">
          <button onClick={() => navigate(-1)} className="mr-3 text-gray-600 p-1 rounded-full active:bg-gray-100">
              <ChevronLeft size={24} />
          </button>
          <div className="flex-1 flex items-center gap-2">
              {isAi ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                      <Bot size={16} />
                  </div>
              ) : (
                  <img src={chat.avatar} className="w-8 h-8 rounded-full bg-gray-200 object-cover" alt="avatar" />
              )}
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">
                    {chat.name}
                </h1>
                {isAi && <div className="text-[10px] text-blue-500 leading-tight">智能助手 . 在线</div>}
              </div>
          </div>
          <button className="text-gray-600 p-2">
              <User size={20} />
          </button>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
          {chat.messages.map(msg => (
              <div key={msg.id} className={`flex w-full ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                  {msg.senderId !== 'me' && (
                      isAi ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-sm mr-2 shrink-0 self-start mt-1">
                              <Bot size={16} />
                          </div>
                      ) : (
                          <img src={chat.avatar} className="w-8 h-8 rounded-full mr-2 self-start bg-gray-200 object-cover mt-1" alt="avatar" />
                      )
                  )}

                  <div className="flex flex-col gap-2 max-w-[75%]">
                      {/* Text Bubble */}
                      {msg.text && (
                          <div className={`rounded-2xl px-4 py-2.5 shadow-sm whitespace-pre-wrap break-words text-[15px] leading-relaxed ${
                              msg.senderId === 'me'
                                  ? 'bg-[#07c160] text-white rounded-tr-sm'
                                  : 'bg-white text-gray-800 rounded-tl-sm'
                          }`}>
                              {msg.text}
                          </div>
                      )}

                      {/* Card Bubble */}
                      {msg.type === 'card' && msg.cardData && (
                          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 w-64">
                              {/* Team Card */}
                              {msg.cardData.type === 'team' && (
                                  <div onClick={() => navigate(`/team/opponent/${msg.cardData.data.id}`)} className="cursor-pointer active:opacity-90 transition-opacity">
                                      <div className="h-24 bg-gray-200 relative">
                                          <img src={msg.cardData.data.logo} className="w-full h-full object-cover" alt="team" />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                          <div className="absolute bottom-2 left-3 flex items-center gap-2">
                                            <div className="text-white font-bold text-lg drop-shadow-sm">
                                                {msg.cardData.data.name}
                                            </div>
                                            {msg.cardData.data.isVerified && (
                                              <div className="bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">已认证</div>
                                            )}
                                          </div>
                                      </div>
                                      <div className="p-3">
                                          <div className="flex justify-between items-center mb-2">
                                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                                  <MapPin size={12} /> {msg.cardData.data.location}
                                              </div>
                                              <div className="text-xs font-bold text-[#07c160]">
                                                  {msg.cardData.data.creditScore}分
                                              </div>
                                          </div>
                                          <div className="flex gap-1 mb-3">
                                              {msg.cardData.data.tags.slice(0, 2).map((tag: string) => (
                                                  <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                                      {tag}
                                                  </span>
                                              ))}
                                          </div>
                                          <div className="w-full bg-[#07c160]/10 text-[#07c160] text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                                              查看详情 <ArrowRight size={12} />
                                          </div>
                                      </div>
                                  </div>
                              )}

                              {/* Match Card */}
                              {msg.cardData.type === 'match' && (
                                  <div onClick={() => navigate(`/matches`)} className="cursor-pointer active:opacity-90 transition-opacity">
                                      <div className="bg-[#07c160] p-3 text-white flex justify-between items-center">
                                          <div className="font-bold flex items-center gap-1">
                                              <Calendar size={14} /> {msg.cardData.data.date}
                                          </div>
                                          <div className="text-xs bg-white/20 px-2 py-0.5 rounded">
                                              {msg.cardData.data.format}
                                          </div>
                                      </div>
                                      <div className="p-3">
                                          <div className="flex items-center gap-3 mb-3">
                                              <img src={msg.cardData.data.hostTeam.logo} className="w-10 h-10 rounded-full bg-gray-200 object-cover" alt="host" />
                                              <div>
                                                  <div className="text-sm font-bold text-gray-900">{msg.cardData.data.hostTeam.name}</div>
                                                  <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <MapPin size={10} /> {msg.cardData.data.location}
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                                              <div className="text-xs text-gray-400">费用 (AA)</div>
                                              <div className="text-lg font-bold text-[#07c160] font-mono">
                                                  ¥{msg.cardData.data.totalPrice / 2}
                                              </div>
                                          </div>
                                          <div className="w-full mt-2 bg-gray-900 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                                              查看详情 <ArrowRight size={12} />
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>

                  {msg.senderId === 'me' && (
                      <img src="https://picsum.photos/seed/lei/100" className="w-8 h-8 rounded-full ml-2 self-start bg-gray-200 object-cover mt-1" alt="me" />
                  )}
              </div>
          ))}

          {/* Typing indicator */}
          {isTyping && <TypingIndicator />}

          <div ref={messagesEndRef} />
      </div>

      {/* Input bar - fixed at bottom with safe area */}
      <div className="bg-white border-t border-gray-200 flex items-end gap-2 px-3 py-2 fixed bottom-0 w-full max-w-md" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          <button className="text-gray-400 p-2 shrink-0 self-end mb-0.5"><Image size={22} /></button>
          <div className="flex-1 bg-gray-100 rounded-xl px-3 py-2 flex items-end min-h-[40px]">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="发送消息..."
              rows={1}
              className="flex-1 bg-transparent outline-none resize-none text-[15px] text-gray-900 placeholder-gray-400 max-h-24 leading-normal"
              style={{ minHeight: '22px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`shrink-0 self-end mb-0.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              canSend
                ? 'bg-[#07c160] text-white active:scale-95 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
              发送
          </button>
      </div>
    </div>
  );
};

export default ChatDetail;