export interface Team {
  id: string;
  name: string;
  logo: string;
  avgAge: number;
  creditScore: number;
  winRate: number; // 0-100
  tags: string[]; // e.g., "球风干净", "裁判争议"
  location: string;
  isVerified: boolean;
  fundBalance: number; // Team public fund
  announcement?: string; // Team internal announcement
  homeJerseyColor?: string; // Primary kit color
  awayJerseyColor?: string; // Secondary kit color
  gender: 'male' | 'female'; // Team gender
  recentResults?: MatchResultSimple[]; // Last 10 matches
  creditHistory?: CreditHistoryItem[]; // Credit score history
}

export interface MatchResultSimple {
  result: 'win' | 'loss' | 'draw';
  score: string; // "5-3"
  opponentName: string;
  date: string;
}

export interface CreditHistoryItem {
  date: string;
  change: number;
  reason: string; // "正常完赛", "爽约", "迟到"
}

export type MatchIntensity = '养生局' | '竞技局' | '激战局';
export type GenderRequirement = 'any' | 'male' | 'female';
export type PlayerLevel = '入门' | '业余' | '校队' | '青训' | '退役职业';
export type StrongFoot = 'right' | 'left' | 'both';

export interface MatchCostBreakdown {
  pitchFee: number;
  refereeFee: number;
  waterFee: number;
}

export interface MatchVAS {
  videoService: boolean; // Platform AI Video Editing
  insurancePlayerIds: string[]; // List of players buying insurance
}

export interface MatchRequest {
  id: string;
  hostTeam: Team;
  date: string; // Display string e.g. "周四 20:00"
  time: string; // ISO Date string e.g. "2025-05-12"
  duration: number; // Match duration in minutes
  format: string; // "7人制", "11人制"
  location: string;
  status: 'open' | 'matched' | 'finished';
  distance: number; // km
  
  // New Fields
  costBreakdown: MatchCostBreakdown; // Detailed costs
  totalPrice: number; // Calculated total
  
  amenities: string[]; // Free facilities e.g. ["免费停车"]
  jerseyColor: string; // hex code
  intensity: MatchIntensity;
  genderReq: GenderRequirement; // New: Opponent gender requirement
  
  vas: MatchVAS; // Value Added Services
  
  guestTeam?: Team; // The team that accepted the match
}

export interface Player {
  id: string;
  name: string;
  number: number;
  position: string; // Forward, Midfielder, Defender, Goalkeeper
  balance: number; // Personal Wallet balance (virtual)
  goals: number;
  assists: number;
  mvpCount: number;
  avatar: string;
  
  // Detailed Info
  height?: number; // cm
  weight?: number; // kg
  strongFoot?: StrongFoot;
  level?: PlayerLevel;
  phone?: string;
}

export interface Bill {
  id: string;
  matchId: string;
  title: string;
  date: string;
  totalAmount: number;
  perHead: number;
  paidCount: number;
  totalCount: number;
  status: 'collecting' | 'completed';
  players: {
    playerId: string;
    status: 'paid' | 'unpaid';
  }[];
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  operator: string; // Name of person who operated
}

export enum UserRole {
  FREE_CAPTAIN = 'FREE_CAPTAIN',
  VIP_CAPTAIN = 'VIP_CAPTAIN',
  PLAYER = 'PLAYER'
}

export interface MatchResult {
  id: string;
  opponentName: string;
  myScore: number;
  opponentScore: number;
  date: string;
  mvpPlayerId: string;
  goals: { playerId: string; count: number }[];
}

export interface MatchRecord {
  id: string;
  opponentId: string;
  opponentName: string;
  opponentLogo: string;
  date: string; // Display string
  isoDate: string; // For sorting
  location: string;
  status: 'upcoming' | 'pending_report' | 'waiting_confirmation' | 'confirm_needed' | 'finished' | 'cancelled';
  
  // Data for finished
  myScore?: number;
  opponentScore?: number;
  mvpPlayerId?: string;
  goals?: { playerId: string, count: number }[];
  assists?: { playerId: string, count: number }[];
  
  // Lineup & Cost
  lineup?: string[]; // Player IDs who attended
  totalFee?: number; // Total cost for my team
  feePerPlayer?: number; // Calculated per head
  
  // Meta
  format?: string;
  duration?: number; // minutes
}

export interface ChatMessage {
  id: string;
  senderId: string; // 'me' or 'other' or 'ai'
  text: string;
  timestamp: number;
  type: 'text' | 'card';
  cardData?: {
    type: 'team' | 'match';
    data: any; // Team or MatchRequest object
  };
}

export interface ChatSession {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  isAi?: boolean;
  messages: ChatMessage[];
}

export interface MatchFilters {
  format?: string;      // "5人制" | "7人制" | "8人制" | "11人制"
  intensity?: MatchIntensity;
  timeRange?: 'today' | 'tomorrow' | 'this_week' | 'all';
  genderReq?: GenderRequirement;
}