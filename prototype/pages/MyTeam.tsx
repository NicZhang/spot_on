import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import NavBar from '../components/NavBar';
import { Users, Wallet, ChevronRight, BellRing, Settings, Plus, Trash2, ArrowUpCircle, ArrowDownCircle, X, ArrowLeftRight, CheckCircle, AlertTriangle, Receipt, Trophy, ShieldCheck } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Toast notification component                                       */
/* ------------------------------------------------------------------ */
const Toast: React.FC<{ message: string; type?: 'success' | 'error'; visible: boolean }> = ({ message, type = 'success', visible }) => {
  if (!visible) return null;
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] animate-slide-down">
      <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${type === 'success' ? 'bg-[#07c160] text-white' : 'bg-red-500 text-white'}`}>
        {type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
        {message}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Confirmation modal component                                       */
/* ------------------------------------------------------------------ */
const ConfirmModal: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}> = ({ visible, title, message, confirmText = '确定', cancelText = '取消', onConfirm, onCancel, danger = false }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white w-full max-w-xs rounded-2xl p-6 space-y-4 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 text-center">{title}</h3>
        <p className="text-sm text-gray-500 text-center">{message}</p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-lg active:bg-gray-200"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 font-bold rounded-lg active:scale-[0.98] transition-transform ${danger ? 'bg-red-500 text-white active:bg-red-600' : 'bg-[#07c160] text-white active:bg-[#06ad56]'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const MyTeam: React.FC = () => {
  const navigate = useNavigate();
  const {
      myTeam,
      myTeams,
      switchTeam,
      createNewTeam,
      players,
      addPlayer,
      removePlayer,
      bills,
      transactions,
      addTransaction,
      role,
      toggleVip,
      markBillReminded
  } = useApp();
  const isVip = role === UserRole.VIP_CAPTAIN;

  // Tabs
  const [activeTab, setActiveTab] = useState<'members' | 'finance'>('members');
  const [financeSubTab, setFinanceSubTab] = useState<'bills' | 'history'>('bills');

  // Modals
  const [showTransModal, setShowTransModal] = useState(false);
  const [showTeamSwitchModal, setShowTeamSwitchModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [transType, setTransType] = useState<'income' | 'expense'>('expense');

  // Form States
  const [transForm, setTransForm] = useState({ amount: '', desc: '' });
  const [newTeamName, setNewTeamName] = useState('');

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({ message: '', type: 'success', visible: false });

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }>({ visible: false, title: '', message: '', onConfirm: () => {} });

  // Transaction form error
  const [transError, setTransError] = useState('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
  };

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Handlers
  const handleAddTransaction = () => {
      const amount = parseFloat(transForm.amount);
      if (!amount || !transForm.desc) {
          setTransError('请填写金额和说明');
          return;
      }
      setTransError('');
      addTransaction(transType, amount, transForm.desc);
      setShowTransModal(false);
      setTransForm({ amount: '', desc: '' });
      showToast(transType === 'income' ? '收入已记录' : '支出已记录');
  };

  const handleCreateTeam = () => {
      if (!newTeamName.trim()) return;
      createNewTeam(newTeamName);
      setNewTeamName('');
      setShowTeamSwitchModal(false);
  };

  const handleRemind = (billId: string) => {
    if (!isVip) {
        navigate('/vip-subscribe');
    } else {
        markBillReminded(billId);
        showToast('已向未支付队员发送系统强提醒通知！');
    }
  };

  const handleRemovePlayer = (playerId: string, playerName: string) => {
    setConfirmModal({
      visible: true,
      title: '移除队员',
      message: `确定要移除 ${playerName} 吗？移除后该队员将无法参与球队活动。`,
      danger: true,
      onConfirm: () => {
        removePlayer(playerId);
        setConfirmModal(prev => ({ ...prev, visible: false }));
        showToast(`已移除 ${playerName}`);
      }
    });
  };

  const handleExportReport = () => {
    if (!isVip) {
      navigate('/vip-subscribe');
    } else {
      showToast('已导出年度财务报表到邮箱！');
    }
  };

  const handleInviteWeChat = () => {
    showToast('已唤起微信分享，好友点击后将进入邀请落地页');
    setShowInviteModal(false);
  };

  const handleInvitePoster = () => {
    showToast('已生成海报保存到相册，扫码即可加入');
    setShowInviteModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24 relative">
      <NavBar title="我的球队" showBack={true} />

      {/* Toast */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      {/* Confirm Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="确定移除"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
        danger={confirmModal.danger}
      />

      {/* Team Header */}
      <div className="bg-white p-6 mb-2">
        <div className="flex items-center gap-4">
          <img src={myTeam.logo} className="w-16 h-16 rounded-lg bg-gray-200 object-cover" alt="team" />
          <div className="flex-1">
            <div
                className="inline-flex items-center gap-2 cursor-pointer active:opacity-70 transition-opacity"
                onClick={() => setShowTeamSwitchModal(true)}
            >
                <h2 className="text-xl font-bold text-gray-900">{myTeam.name}</h2>
                {myTeam.isVerified && (
                  <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] font-bold">已认证</span>
                  </div>
                )}
                <div className="flex items-center text-xs text-[#07c160] bg-[#07c160]/10 px-2 py-1 rounded-full font-medium">
                    <ArrowLeftRight size={12} className="mr-1" />
                    切换
                </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
               {myTeam.gender === 'female' ? (
                   <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded">女足</span>
               ) : (
                   <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">男足</span>
               )}
               <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Lv.4 业余劲旅</span>
               <span className="text-xs text-gray-500">ID: {myTeam.id}</span>
            </div>
          </div>
          <button onClick={() => navigate('/team/settings')}>
            <Settings className="text-gray-400" size={24} />
          </button>
        </div>

        {myTeam.announcement && (
            <div className="mt-4 bg-gray-50 p-3 rounded text-sm text-gray-600 border border-gray-100">
                <span className="font-bold text-gray-800 mr-2">📢 公告:</span>
                {myTeam.announcement}
            </div>
        )}

        <div className="grid grid-cols-4 gap-3 mt-6">
            <div className="text-center cursor-pointer" onClick={() => setActiveTab('members')}>
                <div className="text-xl font-bold text-gray-800">{players.length}</div>
                <div className="text-xs text-gray-500">队员</div>
            </div>
            <div className="text-center cursor-pointer" onClick={() => setActiveTab('finance')}>
                <div className="text-xl font-bold text-gray-800">¥{myTeam.fundBalance}</div>
                <div className="text-xs text-gray-500">队费余额</div>
            </div>
            <div className="text-center">
                <div className="text-xl font-bold text-[#07c160]">{myTeam.creditScore}</div>
                <div className="text-xs text-gray-500">信用分</div>
            </div>
            <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Trophy size={14} className="text-amber-500" />
                  <span className="text-xl font-bold text-amber-600">{myTeam.winRate}%</span>
                </div>
                <div className="text-xs text-gray-500">胜率</div>
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white sticky top-12 z-20 border-b border-gray-100 flex shadow-sm">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-3 text-sm font-medium relative ${activeTab === 'members' ? 'text-[#07c160]' : 'text-gray-500'}`}
        >
          <div className="flex items-center justify-center gap-1">
             <Users size={16} /> 队员管理
          </div>
          {activeTab === 'members' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#07c160]"></div>}
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`flex-1 py-3 text-sm font-medium relative ${activeTab === 'finance' ? 'text-[#07c160]' : 'text-gray-500'}`}
        >
           <div className="flex items-center justify-center gap-1">
             <Wallet size={16} /> 财务收支
          </div>
          {activeTab === 'finance' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#07c160]"></div>}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'members' ? (
          <div className="space-y-3">
             {/* Member Limit Banner */}
             {!isVip && (
                 <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg flex justify-between items-center text-xs text-orange-800">
                     <span>当前成员 {players.length}/30 (免费版上限)</span>
                     <span className="underline font-bold cursor-pointer" onClick={() => navigate('/vip-subscribe')}>升级扩容至100人</span>
                 </div>
             )}

             {/* Add Player CTA */}
             <button
                onClick={() => setShowInviteModal(true)}
                className="w-full bg-white p-3 rounded-lg border border-dashed border-gray-300 flex items-center justify-center gap-2 text-[#07c160] text-sm font-medium active:bg-gray-50 transition-colors"
             >
                <Plus size={16} /> 邀请队员加入
             </button>

             {players.map(player => (
               <div
                    key={player.id}
                    onClick={() => navigate(`/team/player/${player.id}`)}
                    className="bg-white p-3 rounded-lg flex items-center justify-between shadow-sm active:bg-gray-50 cursor-pointer"
               >
                 <div className="flex items-center gap-3">
                   <img src={player.avatar} className="w-10 h-10 rounded-full bg-gray-200 object-cover" alt="avatar" />
                   <div>
                     <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {player.name}
                        {player.id === 'p1' && <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded">队长</span>}
                        {player.balance < 50 && <span className="text-[10px] text-red-500 bg-red-50 px-1 rounded">余额不足</span>}
                     </div>
                     <div className="text-xs text-gray-500 flex items-center gap-1">
                         {player.number}号 | {player.position}
                         {player.level === '退役职业' && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded ml-1">退役职业</span>}
                     </div>
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-xs text-gray-400">出场</div>
                        <div className="text-sm font-bold text-gray-700">12场</div>
                    </div>
                     {/* Remove Action (don't allow removing self) */}
                    {player.id !== 'p1' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePlayer(player.id, player.name);
                            }}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                 </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Finance Dashboard */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-5 text-white shadow-lg">
                <div className="text-xs text-gray-400 mb-1">当前队费 (元)</div>
                <div className="text-3xl font-bold font-mono mb-4">¥ {myTeam.fundBalance.toFixed(2)}</div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setTransType('income'); setTransError(''); setShowTransModal(true); }}
                        className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg py-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                    >
                        <ArrowDownCircle size={16} className="text-[#07c160]" /> 充值收入
                    </button>
                    <button
                         onClick={() => { setTransType('expense'); setTransError(''); setShowTransModal(true); }}
                        className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg py-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                    >
                        <ArrowUpCircle size={16} className="text-orange-500" /> 记一笔支出
                    </button>
                </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex bg-gray-200 p-1 rounded-lg">
                <button
                    onClick={() => setFinanceSubTab('bills')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${financeSubTab === 'bills' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                    待收账单
                </button>
                <button
                    onClick={() => setFinanceSubTab('history')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${financeSubTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                    资金流水
                </button>
                <button
                    onClick={handleExportReport}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all text-amber-600 flex items-center justify-center gap-1`}
                >
                    {!isVip && <Settings size={10} />} 财务报表
                </button>
            </div>

            {financeSubTab === 'bills' ? (
                /* Bill List */
                <div className="space-y-3">
                    {bills.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                          <Receipt size={32} className="text-gray-300" />
                        </div>
                        <div className="text-base font-medium text-gray-400 mb-1">暂无待收账单</div>
                        <div className="text-xs text-gray-300">完赛后自动生成</div>
                      </div>
                    )}
                    {bills.map(bill => (
                    <div key={bill.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <div className="text-sm font-bold text-gray-800">{bill.title}</div>
                                <div className="text-xs text-gray-400 mt-1">{bill.date} . {bill.totalCount}人参与</div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-gray-900">-¥{bill.totalAmount}</div>
                                <div className="text-xs text-orange-500">待收齐 ({bill.paidCount}/{bill.totalCount})</div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-500">未支付 ({bill.totalCount - bill.paidCount}人)</span>
                                <span className="text-xs text-gray-400">人均 ¥{bill.perHead}</span>
                            </div>
                            <div className="flex -space-x-2 overflow-hidden mb-3 min-h-[32px]">
                                {bill.players.filter(p => p.status === 'unpaid').map((p, idx) => {
                                    const playerInfo = players.find(u => u.id === p.playerId);
                                    if(!playerInfo) return null;
                                    return (
                                        <img key={idx} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 object-cover" src={playerInfo.avatar} alt={playerInfo.name}/>
                                    )
                                })}
                            </div>

                            <button
                                onClick={() => handleRemind(bill.id)}
                                className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-transform active:scale-[0.99] ${isVip ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-500'}`}
                            >
                                <BellRing size={16} />
                                {isVip ? "一键强力催收 (短信+推送)" : "一键催收 (升级VIP解锁强提醒)"}
                            </button>
                        </div>
                    </div>
                    ))}
                </div>
            ) : (
                /* Transaction History */
                <div className="space-y-3">
                    {transactions.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                          <Wallet size={32} className="text-gray-300" />
                        </div>
                        <div className="text-base font-medium text-gray-400 mb-1">暂无交易记录</div>
                        <div className="text-xs text-gray-300">记录一笔收入或支出开始使用</div>
                      </div>
                    )}
                    {transactions.map(t => (
                        <div key={t.id} className="bg-white p-4 rounded-lg flex items-center justify-center shadow-sm">
                            <div className="flex items-center gap-3 flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-[#07c160]' : 'bg-red-100 text-red-500'}`}>
                                    {t.type === 'income' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{t.description}</div>
                                    <div className="text-xs text-gray-400">{t.date} . 操作人: {t.operator}</div>
                                </div>
                            </div>
                            <div className={`font-bold font-mono ${t.type === 'income' ? 'text-[#07c160]' : 'text-gray-900'}`}>
                                {t.type === 'income' ? '+' : '-'} {t.amount}
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}
      </div>

      {/* Team Switch Modal */}
      {showTeamSwitchModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowTeamSwitchModal(false)}>
              <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-gray-900">切换当前球队</h3>
                      <button onClick={() => setShowTeamSwitchModal(false)} className="p-1 text-gray-400"><X size={24} /></button>
                  </div>

                  <div className="space-y-3 mb-6">
                      {myTeams.map(team => (
                          <div
                            key={team.id}
                            onClick={() => { switchTeam(team.id); setShowTeamSwitchModal(false); }}
                            className={`p-4 rounded-xl flex items-center gap-3 border transition-colors cursor-pointer ${myTeam.id === team.id ? 'border-[#07c160] bg-[#07c160]/5' : 'border-gray-100 hover:bg-gray-50'}`}
                          >
                              <img src={team.logo} className="w-10 h-10 rounded-full bg-gray-200 object-cover" alt={team.name} />
                              <div className="flex-1">
                                  <div className={`font-bold ${myTeam.id === team.id ? 'text-[#07c160]' : 'text-gray-900'}`}>{team.name}</div>
                                  <div className="text-xs text-gray-500">ID: {team.id}</div>
                              </div>
                              {myTeam.id === team.id && <div className="w-2 h-2 rounded-full bg-[#07c160]"></div>}
                          </div>
                      ))}
                  </div>

                  {isVip ? (
                      <div className="border-t border-gray-100 pt-4">
                          <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="新球队名称"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-sm outline-none"
                              />
                              <button
                                onClick={handleCreateTeam}
                                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold"
                              >
                                  创建新队
                              </button>
                          </div>
                      </div>
                  ) : (
                      <div className="bg-orange-50 p-3 rounded-lg text-xs text-orange-800 flex justify-between items-center">
                          <span>升级VIP可创建并管理多支球队</span>
                          <span className="underline font-bold cursor-pointer" onClick={() => navigate('/vip-subscribe')}>去升级</span>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowInviteModal(false)}>
              <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-gray-900">邀请队员</h3>
                      <button onClick={() => setShowInviteModal(false)} className="p-1 text-gray-400"><X size={24} /></button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                      <button
                        onClick={handleInviteWeChat}
                        className="flex flex-col items-center justify-center gap-2 bg-green-50 p-4 rounded-xl active:bg-green-100"
                      >
                          <div className="w-12 h-12 rounded-full bg-[#07c160] flex items-center justify-center text-white">
                              <Users size={24} />
                          </div>
                          <span className="text-sm font-medium text-gray-800">分享给微信好友</span>
                      </button>
                      <button
                        onClick={handleInvitePoster}
                        className="flex flex-col items-center justify-center gap-2 bg-blue-50 p-4 rounded-xl active:bg-blue-100"
                      >
                          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white">
                              <Wallet size={24} />
                          </div>
                          <span className="text-sm font-medium text-gray-800">生成邀请海报</span>
                      </button>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                      <div className="text-xs text-gray-400 mb-2 text-center">演示流程</div>
                      <button
                        onClick={() => { navigate('/invite'); setShowInviteModal(false); }}
                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold active:scale-[0.99] transition-transform"
                      >
                          模拟新用户点击邀请链接
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Transaction Modal */}
      {showTransModal && (
           <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
               <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6 animate-slide-up">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-gray-900">{transType === 'income' ? '记录收入' : '记录支出'}</h3>
                      <button onClick={() => setShowTransModal(false)} className="p-1 text-gray-400"><X size={24} /></button>
                  </div>

                  {transError && (
                    <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2.5 rounded-lg">
                      <AlertTriangle size={14} />
                      {transError}
                    </div>
                  )}

                  <div className="space-y-4 mb-6">
                      <div>
                          <label className="text-xs text-gray-500 mb-1 block">金额 (¥)</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            autoFocus
                            value={transForm.amount}
                            onChange={(e) => { setTransForm({...transForm, amount: e.target.value}); setTransError(''); }}
                            className="w-full bg-gray-100 p-3 rounded-lg outline-none text-gray-900 text-2xl font-bold font-mono"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-500 mb-1 block">说明</label>
                          <input
                            type="text"
                            placeholder={transType === 'income' ? '例如：赞助费、队费缴纳' : '例如：买水、场地定金'}
                            value={transForm.desc}
                            onChange={(e) => { setTransForm({...transForm, desc: e.target.value}); setTransError(''); }}
                            className="w-full bg-gray-100 p-3 rounded-lg outline-none text-gray-900"
                          />
                      </div>
                  </div>

                  <button
                    onClick={handleAddTransaction}
                    className={`w-full text-white py-3 rounded-xl font-bold active:scale-[0.99] transition-transform ${transType === 'income' ? 'bg-[#07c160]' : 'bg-gray-800'}`}
                  >
                      确认记录
                  </button>
               </div>
           </div>
      )}

    </div>
  );
};

export default MyTeam;