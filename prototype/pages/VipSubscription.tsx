import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import NavBar from '../components/NavBar';
import { Check, Crown, Star, Shield, Zap, X, ChevronRight, RotateCcw } from 'lucide-react';

const VipSubscription: React.FC = () => {
  const navigate = useNavigate();
  const { toggleVip, role } = useApp();
  const [selectedPlan, setSelectedPlan] = useState('season');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'confirming' | 'processing' | 'success'>('idle');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState<'none' | 'not_found' | 'restored'>('none');

  const plans = [
    { id: 'month_trial', name: '首月体验转会', price: 9.9, originalPrice: 19.9, label: '新人特惠', period: '/首月', desc: '试训期，低成本体验', recommended: false },
    { id: 'season', name: '主力赛季卡', price: 49.0, originalPrice: 59.7, label: '超值推荐', period: '/季', desc: '完美覆盖春/秋季联赛', recommended: true },
    { id: 'year', name: '豪门终身约', price: 199.0, originalPrice: 238.8, label: '省¥40', period: '/年', desc: '稳定建制球队首选', recommended: false },
  ];

  const benefits = [
    { icon: <Shield size={24} className="text-blue-500" />, title: '对手透视镜', desc: '查战绩、看人品，拒绝约到"野球拳"' },
    { icon: <Zap size={24} className="text-amber-500" />, title: '智能催收官', desc: '一键强提醒，谈钱不伤感情' },
    { icon: <Crown size={24} className="text-yellow-500" />, title: '职业级战报', desc: '欧冠/英超模板，朋友圈晒图更有面' },
    { icon: <Star size={24} className="text-purple-500" />, title: '豪门扩容', desc: '100人编制，二队三队轻松管' },
  ];

  const comparisonFeatures = [
    { feature: '发布约战', free: true, vip: true },
    { feature: '基础战绩记录', free: true, vip: true },
    { feature: '球队人数上限', free: '20人', vip: '100人' },
    { feature: '对手信用分查看', free: false, vip: true },
    { feature: '对手详细战绩', free: false, vip: true },
    { feature: '智能催费提醒', free: false, vip: true },
    { feature: '英超/欧冠战报模板', free: false, vip: true },
    { feature: '数据导出', free: false, vip: true },
    { feature: 'AI 智能推荐对手', free: false, vip: true },
  ];

  const handleSubscribe = () => {
    setPaymentStatus('confirming');
  };

  const confirmPayment = () => {
    setPaymentStatus('processing');

    setTimeout(() => {
      setPaymentStatus('success');
      setTimeout(() => {
        setPaymentStatus('idle');
        if (role !== 'vip_captain') {
          toggleVip();
        }
        setShowSuccessBanner(true);
        setTimeout(() => {
          navigate(-1);
        }, 2500);
      }, 1200);
    }, 1500);
  };

  const handleRestore = () => {
    setRestoreLoading(true);
    setRestoreResult('none');
    setTimeout(() => {
      setRestoreLoading(false);
      setRestoreResult('not_found');
      setTimeout(() => setRestoreResult('none'), 3000);
    }, 1500);
  };

  const currentPlan = plans.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white pb-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#07c160]/20 to-transparent pointer-events-none"></div>
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#07c160]/10 rounded-full blur-3xl pointer-events-none"></div>

      <NavBar title="会员中心" showBack className="bg-transparent text-white border-none" />

      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="fixed top-0 left-0 right-0 z-[100] max-w-md mx-auto animate-in slide-in-from-top duration-300">
          <div className="mx-4 mt-16 bg-[#07c160] text-white rounded-xl p-4 shadow-2xl shadow-green-900/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Crown size={20} fill="currentColor" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">签约成功！</div>
              <div className="text-xs text-white/80">您已正式升级为尊贵的 VIP 队长，去享受特权吧</div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Result Toast */}
      {restoreResult === 'not_found' && (
        <div className="fixed top-20 left-0 right-0 z-[100] max-w-md mx-auto animate-in fade-in duration-200">
          <div className="mx-4 bg-[#333] text-white rounded-xl p-3 shadow-lg flex items-center gap-2 text-sm">
            <X size={16} className="text-gray-400" />
            <span>未找到可恢复的购买记录</span>
          </div>
        </div>
      )}

      <div className="p-5 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 mt-2">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg mb-4 ring-4 ring-white/10">
            <Crown size={32} className="text-white" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold mb-2">升级 VIP 队长</h1>
          <p className="text-gray-400 text-sm">像职业经理人一样管理你的球队</p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {benefits.map((benefit, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center text-center backdrop-blur-sm">
              <div className="mb-2 bg-white/10 p-2 rounded-full">{benefit.icon}</div>
              <div className="font-bold text-sm mb-1">{benefit.title}</div>
              <div className="text-[10px] text-gray-400 leading-tight">{benefit.desc}</div>
            </div>
          ))}
        </div>

        {/* Comparison Table: Free vs VIP */}
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-[#07c160] rounded-full"></span>
          免费版 vs VIP 对比
        </h3>
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-8 backdrop-blur-sm">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_64px_64px] px-4 py-3 border-b border-white/10 bg-white/5">
            <span className="text-xs text-gray-400 font-medium">功能</span>
            <span className="text-xs text-gray-400 font-medium text-center">免费</span>
            <span className="text-xs text-[#07c160] font-bold text-center">VIP</span>
          </div>
          {/* Table Rows */}
          {comparisonFeatures.map((item, idx) => (
            <div
              key={idx}
              className={`grid grid-cols-[1fr_64px_64px] px-4 py-2.5 items-center ${idx < comparisonFeatures.length - 1 ? 'border-b border-white/5' : ''}`}
            >
              <span className="text-xs text-gray-300">{item.feature}</span>
              <div className="flex justify-center">
                {typeof item.free === 'boolean' ? (
                  item.free ? (
                    <Check size={14} className="text-gray-400" />
                  ) : (
                    <X size={14} className="text-gray-600" />
                  )
                ) : (
                  <span className="text-xs text-gray-400">{item.free}</span>
                )}
              </div>
              <div className="flex justify-center">
                {typeof item.vip === 'boolean' ? (
                  item.vip ? (
                    <Check size={14} className="text-[#07c160]" />
                  ) : (
                    <X size={14} className="text-gray-600" />
                  )
                ) : (
                  <span className="text-xs text-[#07c160] font-bold">{item.vip}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Plans */}
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-[#07c160] rounded-full"></span>
          选择签约方案
        </h3>
        <div className="space-y-3 mb-8">
          {plans.map(plan => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative rounded-xl p-1 transition-all duration-200 cursor-pointer ${
                selectedPlan === plan.id
                  ? 'bg-gradient-to-r from-[#07c160] to-emerald-500 shadow-lg shadow-green-900/50'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {/* Recommended Badge */}
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-lg whitespace-nowrap flex items-center gap-1">
                    <Crown size={10} fill="currentColor" />
                    队长首选
                  </div>
                </div>
              )}

              <div className={`bg-[#252525] rounded-[10px] p-4 flex justify-between items-center h-full ${plan.recommended ? 'border border-amber-500/30' : ''}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold text-lg ${selectedPlan === plan.id ? 'text-[#07c160]' : 'text-white'}`}>{plan.name}</span>
                    {plan.label && (
                      <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                        {plan.label}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{plan.desc}</div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-sm text-gray-500">¥</span>
                    <span className={`text-2xl font-bold font-mono ${selectedPlan === plan.id ? 'text-[#07c160]' : 'text-white'}`}>{plan.price}</span>
                    <span className="text-xs text-gray-500">{plan.period}</span>
                  </div>
                  <div className="text-xs text-gray-500 line-through decoration-gray-600">原价 ¥{plan.originalPrice}</div>
                </div>
              </div>

              {/* Selected Indicator */}
              {selectedPlan === plan.id && (
                <div className="absolute -top-2 -right-2 bg-[#07c160] text-white rounded-full p-1 shadow-md">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* FAQ / Trust */}
        <div className="text-center text-xs text-gray-500 space-y-2 mb-20">
          <p>订阅自动续费，可随时在 Apple ID 设置中取消</p>
          <div className="flex justify-center gap-4 text-gray-600">
            <span className="active:text-gray-400 cursor-pointer">隐私协议</span>
            <span>|</span>
            <span className="active:text-gray-400 cursor-pointer">会员服务条款</span>
          </div>

          {/* Restore Purchase Link */}
          <button
            onClick={handleRestore}
            disabled={restoreLoading}
            className="mt-3 inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-300 active:text-gray-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={12} className={restoreLoading ? 'animate-spin' : ''} />
            <span>{restoreLoading ? '正在恢复...' : '恢复购买'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#1a1a1a] border-t border-white/10 z-20 max-w-md mx-auto">
        <button
          id="pay-btn"
          onClick={handleSubscribe}
          disabled={paymentStatus !== 'idle'}
          className="w-full bg-gradient-to-r from-[#07c160] to-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-900/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
        >
          立即支付 ¥{currentPlan?.price}
        </button>
      </div>

      {/* Payment Confirmation Modal (Apple Pay Style) */}
      {paymentStatus !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => paymentStatus === 'confirming' && setPaymentStatus('idle')}
          ></div>

          {/* Modal Card */}
          <div className="bg-[#1c1c1e] w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 relative z-10 animate-in slide-in-from-bottom duration-300 shadow-2xl border-t border-white/10">
            {/* Handle Bar */}
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6"></div>

            {paymentStatus === 'confirming' && (
              <>
                <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">Spot On (约球)</h3>
                    <p className="text-sm text-gray-400">VIP 队长订阅服务</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Total</div>
                    <div className="text-2xl font-bold text-white font-mono">¥{currentPlan?.price}</div>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">商品</span>
                    <span className="text-white font-medium">{currentPlan?.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">付款方式</span>
                    <div className="flex items-center gap-2 text-white">
                      <div className="w-8 h-5 bg-white rounded flex items-center justify-center">
                        <div className="w-4 h-4 bg-black rounded-full"></div>
                      </div>
                      <span>Apple Pay</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={confirmPayment}
                  className="w-full bg-[#007AFF] active:bg-[#0063cc] text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 mb-4 transition-colors"
                >
                  <div className="w-6 h-6 border-2 border-white rounded-md"></div>
                  确认支付
                </button>

                <div className="text-center text-[10px] text-gray-500">
                  双击侧边按钮确认支付
                </div>
              </>
            )}

            {paymentStatus === 'processing' && (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-white font-bold">正在处理支付...</div>
                <div className="text-sm text-gray-500 mt-1">请勿关闭页面</div>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-[#07c160] rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
                  <Check size={32} className="text-white" strokeWidth={3} />
                </div>
                <div className="text-xl font-bold text-white">支付成功</div>
                <div className="text-sm text-gray-500 mt-1">正在跳转...</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VipSubscription;
