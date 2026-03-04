import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell, Smartphone, FileText, X, Trash2, Info, Lock, Shield, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

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

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useApp();
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isBindingModalOpen, setIsBindingModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [step, setStep] = useState<'wechat' | 'sms'>('wechat');
  const [inputPhone, setInputPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({ message: '', type: 'success', visible: false });

  // Clear cache state
  const [isClearingCache, setIsClearingCache] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
  };

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const handleWeChatBind = () => {
      setTimeout(() => {
          setStep('sms');
          setInputPhone('13800138000');
      }, 1000);
  };

  const handleSendCode = () => {
      if (!inputPhone) return;
      setCountdown(60);
      const timer = setInterval(() => {
          setCountdown(prev => {
              if (prev <= 1) {
                  clearInterval(timer);
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
      showToast('验证码已发送: 1234');
  };

  const handleConfirmBind = () => {
      if (verifyCode === '1234') {
          setPhoneNumber(inputPhone);
          setIsBindingModalOpen(false);
          showToast('手机号绑定成功！');
      } else {
          showToast('验证码错误', 'error');
      }
  };

  const handleLogout = () => {
      logout();
      navigate('/login');
  };

  const handleClearCache = () => {
      setIsClearingCache(true);
      setTimeout(() => {
          setIsClearingCache(false);
          showToast('缓存已清除 (释放 12.3MB)');
      }, 1500);
  };

  /* ================================================================ */
  /*  Sub-pages: Notifications                                         */
  /* ================================================================ */
  if (showNotifications) {
      return (
          <div className="min-h-screen bg-gray-50 pb-safe animate-in slide-in-from-right">
              <div className="bg-white px-4 py-3 flex items-center gap-4 sticky top-0 z-50 border-b border-gray-100">
                  <button onClick={() => setShowNotifications(false)} className="p-1 -ml-1 text-gray-600">
                      <ChevronLeft size={24} />
                  </button>
                  <h1 className="text-lg font-bold text-gray-900">消息通知</h1>
              </div>
              <div className="mt-4 bg-white">
                  <NotificationSwitch label="新消息通知" description="聊天消息、约战请求" defaultChecked />
                  <NotificationSwitch label="赛程提醒" description="比赛开始前2小时提醒" defaultChecked />
                  <NotificationSwitch label="系统公告" description="平台重要通知" defaultChecked />
                  <div className="h-2 bg-gray-50"></div>
                  <NotificationSwitch label="声音" defaultChecked />
                  <NotificationSwitch label="震动" defaultChecked />
              </div>
          </div>
      );
  }

  /* ================================================================ */
  /*  Sub-pages: Agreement                                             */
  /* ================================================================ */
  if (showAgreement) {
      return (
          <div className="min-h-screen bg-gray-50 pb-safe animate-in slide-in-from-right">
              <div className="bg-white px-4 py-3 flex items-center gap-4 sticky top-0 z-50 border-b border-gray-100">
                  <button onClick={() => setShowAgreement(false)} className="p-1 -ml-1 text-gray-600">
                      <ChevronLeft size={24} />
                  </button>
                  <h1 className="text-lg font-bold text-gray-900">用户协议</h1>
              </div>
              <div className="p-4 bg-white min-h-screen text-sm text-gray-600 leading-relaxed space-y-4">
                  <h3 className="font-bold text-gray-900 text-base">1. 服务条款</h3>
                  <p>欢迎使用 Spot On 约球平台。本协议是您与 Spot On 之间关于使用本平台服务所订立的协议。</p>

                  <h3 className="font-bold text-gray-900 text-base">2. 用户行为规范</h3>
                  <p>用户在使用本服务时，必须遵守中华人民共和国相关法律法规的规定，不得利用本服务进行任何违法或不正当的活动。</p>

                  <h3 className="font-bold text-gray-900 text-base">3. 约球规则</h3>
                  <p>用户在发起或参与约球活动时，应遵守诚实守信原则。爽约、迟到等行为将影响您的信用评分。</p>

                  <div className="text-xs text-gray-400 pt-8 text-center">
                      最后更新日期：2025年5月20日
                  </div>
              </div>
          </div>
      );
  }

  /* ================================================================ */
  /*  Sub-pages: Privacy Policy                                        */
  /* ================================================================ */
  if (showPrivacy) {
      return (
          <div className="min-h-screen bg-gray-50 pb-safe animate-in slide-in-from-right">
              <div className="bg-white px-4 py-3 flex items-center gap-4 sticky top-0 z-50 border-b border-gray-100">
                  <button onClick={() => setShowPrivacy(false)} className="p-1 -ml-1 text-gray-600">
                      <ChevronLeft size={24} />
                  </button>
                  <h1 className="text-lg font-bold text-gray-900">隐私政策</h1>
              </div>
              <div className="p-4 bg-white min-h-screen text-sm text-gray-600 leading-relaxed space-y-4">
                  <h3 className="font-bold text-gray-900 text-base">1. 信息收集</h3>
                  <p>我们重视您的隐私保护。在使用我们的服务时，我们可能会收集和使用您的相关信息。</p>

                  <h3 className="font-bold text-gray-900 text-base">2. 信息使用</h3>
                  <p>我们将通过本隐私政策向您说明，我们在您使用我们的服务时如何收集、使用、储存和分享这些信息。</p>

                  <h3 className="font-bold text-gray-900 text-base">3. 信息保护</h3>
                  <p>我们采用业界领先的安全技术来保护您的个人信息，防止未经授权的访问、修改或泄露。</p>

                  <div className="text-xs text-gray-400 pt-8 text-center">
                      最后更新日期：2025年5月20日
                  </div>
              </div>
          </div>
      );
  }

  /* ================================================================ */
  /*  Main settings page                                               */
  /* ================================================================ */
  return (
    <div className="min-h-screen bg-gray-50 pb-safe relative">
      {/* Toast */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-4 sticky top-0 z-50 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-600">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">设置</h1>
      </div>

      <div className="mt-4 space-y-4">
        {/* ---- Section: Account ---- */}
        <div className="bg-white">
          <div className="px-4 py-2.5 text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Lock size={12} />
            账户
          </div>
          <SettingsItem
            icon={Smartphone}
            label="手机号绑定"
            value={phoneNumber ? phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : "未绑定"}
            valueColor={phoneNumber ? 'text-[#07c160]' : 'text-orange-500'}
            onClick={() => {
                setStep('wechat');
                setIsBindingModalOpen(true);
            }}
          />
        </div>

        {/* ---- Section: Notifications ---- */}
        <div className="bg-white">
          <div className="px-4 py-2.5 text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Bell size={12} />
            通知
          </div>
          <SettingsItem
            icon={Bell}
            label="消息通知"
            value="已开启"
            valueColor="text-[#07c160]"
            onClick={() => setShowNotifications(true)}
          />
        </div>

        {/* ---- Section: Privacy ---- */}
        <div className="bg-white">
          <div className="px-4 py-2.5 text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Shield size={12} />
            隐私
          </div>
          <SettingsItem
            icon={FileText}
            label="用户协议"
            onClick={() => setShowAgreement(true)}
          />
          <SettingsItem
            icon={Shield}
            label="隐私政策"
            onClick={() => setShowPrivacy(true)}
          />
        </div>

        {/* ---- Section: About ---- */}
        <div className="bg-white">
          <div className="px-4 py-2.5 text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Info size={12} />
            关于
          </div>
          <SettingsItem
            icon={Trash2}
            label="清除缓存"
            value={isClearingCache ? '清除中...' : '12.3 MB'}
            onClick={handleClearCache}
          />
          <SettingsItem
            icon={Info}
            label="当前版本"
            value="v1.0.0"
            noArrow
          />
        </div>

        {/* ---- Logout Button ---- */}
        <div className="bg-white mt-4">
             <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="w-full py-3.5 text-center text-red-500 font-bold active:bg-red-50 flex items-center justify-center gap-2 transition-colors"
             >
                 <LogOut size={18} />
                 退出登录
             </button>
        </div>

        {/* ---- Version Footer ---- */}
        <div className="text-center py-6 space-y-1">
            <div className="text-xs text-gray-400 font-medium">Spot On 约球平台</div>
            <div className="text-[10px] text-gray-300">Version 1.0.0 (Build 20250520)</div>
            <div className="text-[10px] text-gray-300">Copyright 2025 Spot On. All rights reserved.</div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-xs rounded-xl p-6 space-y-4 animate-in zoom-in-95">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                    <LogOut size={24} className="text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 text-center">确认退出登录？</h3>
                  <p className="text-sm text-gray-500 text-center">退出后将无法收到消息通知</p>
                  <div className="flex gap-3 pt-2">
                      <button
                          onClick={() => setIsLogoutModalOpen(false)}
                          className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-lg active:bg-gray-200"
                      >
                          取消
                      </button>
                      <button
                          onClick={handleLogout}
                          className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-lg active:bg-red-600"
                      >
                          退出
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Phone Binding Modal */}
      {isBindingModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-sm rounded-t-xl sm:rounded-xl p-6 space-y-6 animate-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold text-gray-900">
                          {step === 'wechat' ? '获取微信手机号' : '验证新手机号'}
                      </h3>
                      <button onClick={() => setIsBindingModalOpen(false)} className="text-gray-400">
                          <X size={24} />
                      </button>
                  </div>

                  {step === 'wechat' ? (
                      <div className="space-y-4">
                          <p className="text-sm text-gray-500">
                              为了保障您的账号安全，我们需要获取您的微信手机号进行绑定。
                          </p>
                          <button
                              onClick={handleWeChatBind}
                              className="w-full bg-[#07c160] text-white font-bold py-3 rounded-lg active:bg-[#06ad56] flex items-center justify-center gap-2"
                          >
                              <Smartphone size={20} />
                              微信一键获取
                          </button>
                          <button
                              onClick={() => { setStep('sms'); setInputPhone(''); }}
                              className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-lg active:bg-gray-200"
                          >
                              输入其他手机号
                          </button>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs text-gray-500 mb-1">手机号</label>
                              <input
                                  type="tel"
                                  value={inputPhone}
                                  onChange={e => setInputPhone(e.target.value)}
                                  placeholder="请输入手机号"
                                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-[#07c160]"
                              />
                          </div>
                          <div>
                              <label className="block text-xs text-gray-500 mb-1">验证码</label>
                              <div className="flex gap-2">
                                  <input
                                      type="text"
                                      value={verifyCode}
                                      onChange={e => setVerifyCode(e.target.value)}
                                      placeholder="请输入验证码"
                                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-[#07c160]"
                                  />
                                  <button
                                      disabled={countdown > 0 || !inputPhone}
                                      onClick={handleSendCode}
                                      className={`px-4 rounded-lg text-sm font-medium ${countdown > 0 || !inputPhone ? 'bg-gray-100 text-gray-400' : 'bg-[#07c160] text-white'}`}
                                  >
                                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                                  </button>
                              </div>
                          </div>
                          <button
                              onClick={handleConfirmBind}
                              className="w-full bg-[#07c160] text-white font-bold py-3 rounded-lg active:bg-[#06ad56] mt-4"
                          >
                              确认绑定
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Settings item component                                            */
/* ------------------------------------------------------------------ */
const SettingsItem: React.FC<{
  icon: any;
  label: string;
  value?: string;
  valueColor?: string;
  onClick?: () => void;
  noArrow?: boolean;
}> = ({ icon: Icon, label, value, valueColor = 'text-gray-400', onClick, noArrow = false }) => (
    <div
        onClick={onClick}
        className={`flex items-center justify-between px-4 py-3.5 bg-white border-b border-gray-50 last:border-0 ${onClick ? 'active:bg-gray-50 cursor-pointer' : ''}`}
    >
        <div className="flex items-center gap-3">
            <Icon size={18} className="text-gray-400" />
            <span className="text-sm text-gray-800">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className={`text-xs ${valueColor}`}>{value}</span>}
            {!noArrow && <ChevronLeft size={16} className="text-gray-300 rotate-180" />}
        </div>
    </div>
);

/* ------------------------------------------------------------------ */
/*  Notification toggle component                                      */
/* ------------------------------------------------------------------ */
const NotificationSwitch = ({ label, description, defaultChecked }: { label: string, description?: string, defaultChecked?: boolean }) => {
    const [checked, setChecked] = useState(defaultChecked);
    return (
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-0">
            <div>
                <div className="text-sm text-gray-900">{label}</div>
                {description && <div className="text-xs text-gray-400 mt-0.5">{description}</div>}
            </div>
            <button
                onClick={() => setChecked(!checked)}
                className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-[#07c160]' : 'bg-gray-200'}`}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
    );
};

export default Settings;