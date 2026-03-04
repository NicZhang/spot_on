import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole, Team, MatchRequest, Player, Bill, MatchResult, MatchIntensity, MatchCostBreakdown, MatchVAS, GenderRequirement, Transaction, MatchRecord, ChatSession, ChatMessage } from '../types';

// Mock Data
const MOCK_TEAM_INITIAL: Team = {
  id: 't1',
  name: '暴风联队',
  logo: 'https://picsum.photos/seed/storm/200',
  avgAge: 32,
  creditScore: 98,
  winRate: 65,
  tags: ['准时', 'AA爽快'],
  location: '朝阳公园足球场',
  isVerified: true,
  fundBalance: 1240,
  announcement: '每周四晚8点固定活动，请提前报名！',
  homeJerseyColor: '#3b82f6', // Blue default
  awayJerseyColor: '#ffffff',  // White default
  gender: 'male'
};

const MOCK_OPPONENTS: Team[] = [
  { 
    id: 't2', name: '皇家体校队', logo: 'https://picsum.photos/seed/royal/200', avgAge: 22, creditScore: 85, winRate: 90, 
    tags: ['跑不死', '动作大'], location: '奥体中心', isVerified: true, fundBalance: 0, gender: 'male',
    recentResults: [
        { result: 'win', score: '5-2', opponentName: '老男孩', date: '2025-05-01' },
        { result: 'win', score: '3-0', opponentName: '飞虎队', date: '2025-04-28' },
        { result: 'loss', score: '1-2', opponentName: '国安梯队', date: '2025-04-20' },
    ],
    creditHistory: [
        { date: '2025-05-01', change: 2, reason: '正常完赛' },
        { date: '2025-04-20', change: -10, reason: '临期取消' },
    ]
  },
  { 
    id: 't3', name: '周四养生局', logo: 'https://picsum.photos/seed/thurs/200', avgAge: 40, creditScore: 100, winRate: 30, 
    tags: ['球风干净', '技术流'], location: '大兴足球公园', isVerified: true, fundBalance: 0, gender: 'male',
    recentResults: [
        { result: 'loss', score: '2-5', opponentName: '暴风联队', date: '2025-05-02' },
        { result: 'draw', score: '3-3', opponentName: '快乐足球', date: '2025-04-25' },
    ],
    creditHistory: [
        { date: '2025-05-02', change: 2, reason: '正常完赛' },
        { date: '2025-04-25', change: 2, reason: '正常完赛' },
    ]
  },
  { 
    id: 't4', name: '鸽子联队', logo: 'https://picsum.photos/seed/pigeon/200', avgAge: 28, creditScore: 55, winRate: 50, 
    tags: ['经常迟到', '裁判争议'], location: '通州运河', isVerified: false, fundBalance: 0, gender: 'male',
    recentResults: [
        { result: 'win', score: '1-0', opponentName: '不知名队', date: '2025-05-05' },
    ],
    creditHistory: [
        { date: '2025-05-05', change: -50, reason: '爽约' },
    ]
  },
];

const MOCK_MATCH_REQUESTS: MatchRequest[] = [
  { 
    id: 'm1', hostTeam: MOCK_OPPONENTS[0], date: '周四 20:00', time: '2025-05-12T20:00:00', duration: 120, format: '7人制', location: '奥体中心', status: 'open', distance: 5.2,
    costBreakdown: { pitchFee: 600, refereeFee: 200, waterFee: 0 }, totalPrice: 800,
    amenities: ['免费停车'], jerseyColor: '#ef4444', intensity: '竞技局', genderReq: 'male',
    vas: { videoService: true, insurancePlayerIds: [] }
  },
  { 
    id: 'm2', hostTeam: MOCK_OPPONENTS[1], date: '周四 21:00', time: '2025-05-12T21:00:00', duration: 90, format: '8人制', location: '大兴足球公园', status: 'open', distance: 12.5,
    costBreakdown: { pitchFee: 700, refereeFee: 0, waterFee: 0 }, totalPrice: 700,
    amenities: ['夜场灯光'], jerseyColor: '#ffffff', intensity: '养生局', genderReq: 'any',
    vas: { videoService: false, insurancePlayerIds: [] }
  },
  { 
    id: 'm3', hostTeam: MOCK_OPPONENTS[2], date: '周五 19:00', time: '2025-05-13T19:00:00', duration: 120, format: '5人制', location: '通州运河', status: 'open', distance: 8.0,
    costBreakdown: { pitchFee: 400, refereeFee: 150, waterFee: 50 }, totalPrice: 600,
    amenities: ['免费停车'], jerseyColor: '#3b82f6', intensity: '竞技局', genderReq: 'any',
    vas: { videoService: false, insurancePlayerIds: [] }
  },
];

const MOCK_PLAYERS_INITIAL: Player[] = [
  { 
    id: 'p1', name: '老雷 (我)', number: 10, position: '中场', balance: 500, goals: 12, assists: 8, mvpCount: 3, avatar: 'https://picsum.photos/seed/lei/100',
    height: 178, weight: 75, strongFoot: 'right', level: '业余', phone: '13800138000'
  },
  { 
    id: 'p2', name: '大刘', number: 4, position: '后卫', balance: 20, goals: 1, assists: 0, mvpCount: 0, avatar: 'https://picsum.photos/seed/liu/100',
    height: 185, weight: 88, strongFoot: 'right', level: '入门'
  },
  { 
    id: 'p3', name: '小王', number: 7, position: '前锋', balance: 150, goals: 25, assists: 5, mvpCount: 8, avatar: 'https://picsum.photos/seed/wang/100',
    height: 172, weight: 65, strongFoot: 'left', level: '退役职业'
  },
  { 
    id: 'p4', name: '门神赵', number: 1, position: '门将', balance: 0, goals: 0, assists: 1, mvpCount: 5, avatar: 'https://picsum.photos/seed/zhao/100',
    height: 190, weight: 82, strongFoot: 'right', level: '青训'
  },
];

const MOCK_BILLS_INITIAL: Bill[] = [
  { 
    id: 'b1', matchId: 'finished_1', title: '周四晚8点场地费', date: '05-12 20:00',
    totalAmount: 840, perHead: 60, paidCount: 8, totalCount: 14, status: 'collecting',
    players: MOCK_PLAYERS_INITIAL.map(p => ({ playerId: p.id, status: p.balance > 50 ? 'paid' : 'unpaid' }))
  }
];

const MOCK_HISTORY: MatchResult[] = [
  { id: 'h1', opponentName: '咸鱼联队', myScore: 5, opponentScore: 3, date: '2025-02-10', mvpPlayerId: 'p1', goals: [{ playerId: 'p1', count: 2 }, { playerId: 'p3', count: 3 }] }
];

const MOCK_TRANSACTIONS_INITIAL: Transaction[] = [
    { id: 'tr1', type: 'income', amount: 2000, description: '赛季初充值', date: '2025-01-01', operator: '老雷' },
    { id: 'tr2', type: 'expense', amount: 800, description: '1月5日场地费', date: '2025-01-05', operator: '老雷' },
    { id: 'tr3', type: 'expense', amount: 45, description: '1月5日买水', date: '2025-01-05', operator: '老雷' },
];

export interface CreateMatchInput {
  dateStr: string; 
  isoDate: string;
  duration: number;
  format: string;
  location: string;
  
  costBreakdown: MatchCostBreakdown;
  
  amenities: string[];
  jerseyColor: string;
  intensity: MatchIntensity;
  genderReq: GenderRequirement;
  
  vas: MatchVAS;
}

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  myTeam: Team;
  updateTeamInfo: (info: Partial<Team>) => void;
  myTeams: Team[];
  switchTeam: (teamId: string) => void;
  createNewTeam: (name: string) => void;
  
  matches: MatchRequest[];
  createMatch: (input: CreateMatchInput) => void;
  
  players: Player[];
  addPlayer: () => void;
  removePlayer: (id: string) => void;
  updatePlayer: (id: string, data: Partial<Player>) => void;
  
  bills: Bill[];
  markBillReminded: (billId: string) => void;
  
  transactions: Transaction[];
  addTransaction: (type: 'income' | 'expense', amount: number, description: string) => void;
  
  history: MatchResult[];
  toggleVip: () => void;
  
  opponents: Team[]; // List of all teams in the system

  mySchedule: MatchRecord[];
  updateMatchRecord: (record: MatchRecord) => void;
  completeMatch: (record: MatchRecord) => void;
  checkMatchConflict: (match: MatchRequest) => MatchRecord | null;
  acceptMatch: (matchId: string) => 'success' | 'insufficient_funds' | 'time_conflict';
  cancelMatch: (matchId: string) => void;

  // Chat
  chats: ChatSession[];
  addChatMessage: (chatId: string, text: string, senderId?: string, type?: 'text' | 'card', cardData?: any) => void;
  createChat: (targetId: string, name: string, avatar: string) => string;
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(UserRole.FREE_CAPTAIN);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [matches, setMatches] = useState<MatchRequest[]>(MOCK_MATCH_REQUESTS);
  const [myTeam, setMyTeam] = useState<Team>(MOCK_TEAM_INITIAL);
  const [players, setPlayers] = useState<Player[]>(MOCK_PLAYERS_INITIAL);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS_INITIAL);
  const [bills, setBills] = useState<Bill[]>(MOCK_BILLS_INITIAL);
  const [opponents, setOpponents] = useState<Team[]>(MOCK_OPPONENTS);
  
  const [mySchedule, setMySchedule] = useState<MatchRecord[]>([
    { 
        id: 'm_pending_1', opponentId: 't2', opponentName: '皇家体校队', opponentLogo: 'https://picsum.photos/seed/royal/200',
        date: '昨天 20:00', isoDate: '2025-05-20T20:00:00', location: '奥体中心', status: 'pending_report', format: '7人制',
        myScore: 0, opponentScore: 0, goals: [], assists: []
    },
    { 
        id: 'm_upcoming_1', opponentId: 't3', opponentName: '周四养生局', opponentLogo: 'https://picsum.photos/seed/thurs/200',
        date: '明天 19:00', isoDate: '2025-05-22T19:00:00', location: '大兴足球公园', status: 'upcoming', format: '8人制'
    },
    { 
        id: 'm_finished_1', opponentId: 't_fish', opponentName: '咸鱼联队', opponentLogo: 'https://picsum.photos/seed/fish/200',
        date: '明天 19:00', isoDate: '2025-05-22T19:00:00', location: '大兴足球公园', status: 'upcoming', format: '8人制'
    },
    { 
        id: 'm_finished_1', opponentId: 't_fish', opponentName: '咸鱼联队', opponentLogo: 'https://picsum.photos/seed/fish/200',
        date: '2025-02-10', isoDate: '2025-02-10T14:00:00', location: '朝阳公园', status: 'finished', format: '5人制',
        myScore: 5, opponentScore: 3, mvpPlayerId: 'p1', 
        goals: [{ playerId: 'p1', count: 2 }, { playerId: 'p3', count: 3 }],
        assists: [{ playerId: 'p1', count: 1 }]
    }
  ]);

  // Chat State
  const [chats, setChats] = useState<ChatSession[]>([
    {
      id: 'ai_agent',
      name: 'Spot On 智能助手',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=spoton',
      lastMessage: '你好！我是你的足球助手，可以帮你找球队、约比赛。',
      lastTime: '刚刚',
      unreadCount: 1,
      isAi: true,
      messages: [
        {
          id: 'm1',
          senderId: 'ai',
          text: '你好！我是你的足球助手，可以帮你找球队、约比赛。试试问我：“帮我推荐附近的球队”',
          timestamp: Date.now(),
          type: 'text'
        }
      ]
    },
    {
        id: 'c_1',
        name: '烈火队长-张三',
        avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d',
        lastMessage: '下周六有空吗？约一场？',
        lastTime: '10:30',
        unreadCount: 2,
        messages: [
            { id: 'm1', senderId: 'other', text: '你好，看到你们球队在招人？', timestamp: Date.now() - 100000, type: 'text' },
            { id: 'm2', senderId: 'me', text: '是的，我们在招后卫。', timestamp: Date.now() - 90000, type: 'text' },
            { id: 'm3', senderId: 'other', text: '下周六有空吗？约一场？', timestamp: Date.now(), type: 'text' }
        ]
    }
  ]);

  const addChatMessage = (chatId: string, text: string, senderId: string = 'me', type: 'text' | 'card' = 'text', cardData?: any) => {
      setChats(prev => prev.map(chat => {
          if (chat.id === chatId) {
              return {
                  ...chat,
                  lastMessage: type === 'card' ? '[卡片消息]' : text,
                  lastTime: '刚刚',
                  messages: [
                      ...chat.messages,
                      {
                          id: `msg_${Date.now()}`,
                          senderId,
                          text,
                          timestamp: Date.now(),
                          type,
                          cardData
                      }
                  ]
              };
          }
          return chat;
      }));
  };

  const createChat = (targetId: string, name: string, avatar: string) => {
      const existingChat = chats.find(c => c.id === targetId);
      if (existingChat) return targetId;

      const newChat: ChatSession = {
          id: targetId,
          name,
          avatar,
          lastMessage: '',
          lastTime: '刚刚',
          unreadCount: 0,
          messages: []
      };
      setChats([newChat, ...chats]);
      return targetId;
  };

  const toggleVip = () => {
    setRole(prev => prev === UserRole.VIP_CAPTAIN ? UserRole.FREE_CAPTAIN : UserRole.VIP_CAPTAIN);
  };

  const updateMatchRecord = (record: MatchRecord) => {
      setMySchedule(prev => prev.map(m => m.id === record.id ? record : m));
  };

  const checkMatchConflict = (match: MatchRequest): MatchRecord | null => {
      const newMatchStart = new Date(match.time).getTime();
      const newMatchEnd = newMatchStart + (match.duration * 60 * 1000);

      const conflict = mySchedule.find(record => {
          if (record.status === 'finished') return false;
          
          const recordStart = new Date(record.isoDate).getTime();
          const recordDuration = record.duration || 120;
          const recordEnd = recordStart + (recordDuration * 60 * 1000);

          return (newMatchStart < recordEnd && recordStart < newMatchEnd);
      });

      return conflict || null;
  };

  const acceptMatch = (matchId: string): 'success' | 'insufficient_funds' | 'time_conflict' => {
      const match = matches.find(m => m.id === matchId);
      if (!match) return 'insufficient_funds';

      // Check Time Conflict
      const newMatchStart = new Date(match.time).getTime();
      const newMatchEnd = newMatchStart + (match.duration * 60 * 1000);

      console.log(`[AcceptMatch] Checking conflict for ${match.id} (${match.time})`);
      console.log(`[AcceptMatch] New Match: ${new Date(newMatchStart).toLocaleString()} - ${new Date(newMatchEnd).toLocaleString()}`);
      console.log(`[AcceptMatch] Current Schedule:`, mySchedule);

      const hasConflict = mySchedule.some(record => {
          if (record.status === 'finished') return false; 
          
          const recordStart = new Date(record.isoDate).getTime();
          const recordDuration = record.duration || 120; 
          const recordEnd = recordStart + (recordDuration * 60 * 1000);

          const isOverlap = (newMatchStart < recordEnd && recordStart < newMatchEnd);
          
          console.log(`  - Checking vs ${record.id} (${record.isoDate}): ${isOverlap ? 'CONFLICT' : 'OK'}`);
          console.log(`    Record: ${new Date(recordStart).toLocaleString()} - ${new Date(recordEnd).toLocaleString()}`);
          
          return isOverlap;
      });

      if (hasConflict) {
          console.log('[AcceptMatch] Conflict detected!');
          return 'time_conflict';
      }

      const deposit = match.totalPrice / 2;
      
      // Check Balance
      if (myTeam.fundBalance < deposit) {
          return 'insufficient_funds';
      }

      // 1. Deduct Balance & Record Transaction
      setMyTeam(prev => ({ ...prev, fundBalance: prev.fundBalance - deposit }));
      
      const newTrans: Transaction = {
          id: `tr_${Date.now()}`,
          type: 'expense',
          amount: deposit,
          description: `约战预付定金: ${match.hostTeam.name} ${match.date}`,
          date: new Date().toISOString().split('T')[0],
          operator: '老雷'
      };
      setTransactions(prev => [newTrans, ...prev]);

      // 2. Update the global match pool
      setMatches(prev => prev.map(m => {
          if (m.id === matchId) {
              return { ...m, status: 'matched', guestTeam: myTeam };
          }
          return m;
      }));

      // 3. Add to my schedule
      const newRecord: MatchRecord = {
          id: match.id,
          opponentId: match.hostTeam.id,
          opponentName: match.hostTeam.name,
          opponentLogo: match.hostTeam.logo,
          date: match.date,
          isoDate: match.time,
          location: match.location,
          status: 'upcoming',
          format: match.format,
          totalFee: match.totalPrice / 2, // Assuming split cost
          duration: match.duration
      };
      setMySchedule(prev => [newRecord, ...prev]);
      
      return 'success';
  };

  const cancelMatch = (matchId: string) => {
      const match = matches.find(m => m.id === matchId);
      if (match) {
          const deposit = match.totalPrice / 2;
          
          // 1. Refund Balance & Record Transaction
          setMyTeam(prev => ({ ...prev, fundBalance: prev.fundBalance + deposit }));
          
          const newTrans: Transaction = {
              id: `tr_${Date.now()}`,
              type: 'income',
              amount: deposit,
              description: `取消约战退款: ${match.hostTeam.name}`,
              date: new Date().toISOString().split('T')[0],
              operator: '老雷'
          };
          setTransactions(prev => [newTrans, ...prev]);
      }

      // 2. Remove from schedule
      setMySchedule(prev => prev.filter(m => m.id !== matchId));

      // 3. Re-open in global pool
      setMatches(prev => prev.map(m => {
          if (m.id === matchId) {
              const { guestTeam, ...rest } = m; // Remove guestTeam
              return { ...rest, status: 'open' };
          }
          return m;
      }));
  };

  const completeMatch = (record: MatchRecord) => {
      // 1. Update Schedule
      setMySchedule(prev => prev.map(m => m.id === record.id ? record : m));

      // 2. Update Player Stats
      const newPlayers = [...players];
      record.goals?.forEach(g => {
          const p = newPlayers.find(pl => pl.id === g.playerId);
          if(p) p.goals += g.count;
      });
      record.assists?.forEach(a => {
          const p = newPlayers.find(pl => pl.id === a.playerId);
          if(p) p.assists += a.count;
      });
      if (record.mvpPlayerId) {
          const p = newPlayers.find(pl => pl.id === record.mvpPlayerId);
          if(p) p.mvpCount += 1;
      }
      
      // 3. Generate Bill
      // Check if bill already exists to avoid duplicates
      const existingBill = bills.find(b => b.matchId === record.id);
      if (!existingBill && record.lineup && record.lineup.length > 0 && record.totalFee) {
          const perHead = Math.ceil(record.totalFee / record.lineup.length);
          const newBill: Bill = {
              id: `b_${Date.now()}`,
              matchId: record.id,
              title: `${record.date} vs ${record.opponentName}`,
              date: new Date().toLocaleDateString(),
              totalAmount: record.totalFee,
              perHead: perHead,
              paidCount: 0,
              totalCount: record.lineup.length,
              status: 'collecting',
              players: record.lineup.map(pid => ({ playerId: pid, status: 'unpaid' }))
          };
          setBills([newBill, ...bills]);
          
          // Deduct balance from players
          record.lineup.forEach(pid => {
              const p = newPlayers.find(pl => pl.id === pid);
              if(p) p.balance -= perHead;
          });
      }

      setPlayers(newPlayers);
      
      // 4. Update Team Stats (Mock)
      if (record.myScore !== undefined && record.opponentScore !== undefined) {
          setMyTeam(prev => ({
              ...prev,
              winRate: record.myScore > record.opponentScore ? Math.min(100, prev.winRate + 2) : Math.max(0, prev.winRate - 1),
              creditScore: Math.min(100, prev.creditScore + 1) // Completed match adds credit
          }));
      }
  };

  const updateTeamInfo = (info: Partial<Team>) => {
      setMyTeam(prev => ({ ...prev, ...info }));
  };

  const [myTeams, setMyTeams] = useState<Team[]>([MOCK_TEAM_INITIAL]);

  const switchTeam = (teamId: string) => {
      const team = myTeams.find(t => t.id === teamId);
      if (team) {
          setMyTeam(team);
      }
  };

  const createNewTeam = (name: string) => {
      const newTeam: Team = {
          ...MOCK_TEAM_INITIAL,
          id: `t_${Date.now()}`,
          name: name,
          logo: `https://picsum.photos/seed/${Date.now()}/200`,
          fundBalance: 0,
          creditScore: 60
      };
      setMyTeams([...myTeams, newTeam]);
      setMyTeam(newTeam);
  };

  const createMatch = (input: CreateMatchInput) => {
    const totalPrice = input.costBreakdown.pitchFee + input.costBreakdown.refereeFee + input.costBreakdown.waterFee;
    
    const newMatch: MatchRequest = {
      id: `m_${Date.now()}`,
      hostTeam: myTeam, // Use current team
      date: input.dateStr,
      time: input.isoDate,
      duration: input.duration,
      format: input.format,
      location: input.location,
      status: 'open',
      distance: 0.1, 
      amenities: input.amenities,
      jerseyColor: input.jerseyColor,
      intensity: input.intensity,
      genderReq: input.genderReq,
      costBreakdown: input.costBreakdown,
      totalPrice: totalPrice,
      vas: input.vas
    };
    setMatches([newMatch, ...matches]);
  };

  const addPlayer = () => {
      const names = ['小李', '阿强', 'Tony', 'Allen', '大壮', '皮皮'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      const newPlayer: Player = {
          id: `new_p_${Date.now()}`,
          name: randomName,
          number: Math.floor(Math.random() * 99),
          position: '中场',
          balance: 0,
          goals: 0,
          assists: 0,
          mvpCount: 0,
          avatar: `https://picsum.photos/seed/${Date.now()}/100`,
          level: '业余'
      };
      setPlayers([...players, newPlayer]);
  };

  const removePlayer = (id: string) => {
      setPlayers(players.filter(p => p.id !== id));
  };

  const updatePlayer = (id: string, data: Partial<Player>) => {
      setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const addTransaction = (type: 'income' | 'expense', amount: number, description: string) => {
      const newTrans: Transaction = {
          id: `tr_${Date.now()}`,
          type,
          amount,
          description,
          date: new Date().toISOString().split('T')[0],
          operator: '老雷'
      };
      
      // Update balance
      setMyTeam(prev => ({
          ...prev,
          fundBalance: type === 'income' ? prev.fundBalance + amount : prev.fundBalance - amount
      }));
      
      setTransactions([newTrans, ...transactions]);
  };

  const markBillReminded = (billId: string) => {
      // Mock function, just logic placeholder
      console.log(`Reminded bill ${billId}`);
  };

  const login = () => {
      setIsLoggedIn(true);
  };

  const logout = () => {
      setIsLoggedIn(false);
  };

  return (
    <AppContext.Provider value={{
      isLoggedIn,
      login,
      logout,
      role,
      setRole,
      myTeam,
      updateTeamInfo,
      myTeams,
      switchTeam,
      createNewTeam,
      matches,
      createMatch,
      players,
      addPlayer,
      removePlayer,
      updatePlayer,
      bills,
      markBillReminded,
      transactions,
      addTransaction,
      history: MOCK_HISTORY,
      toggleVip,
      opponents,
      mySchedule,
      updateMatchRecord,
      completeMatch,
      checkMatchConflict,
      acceptMatch,
      cancelMatch,
      chats,
      addChatMessage,
      createChat
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};