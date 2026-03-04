import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell, Smartphone, FileText, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

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

  const handleWeChatBind = () => {
      // Mock WeChat GetPhoneNumber
      setTimeout(() => {
          setStep('sms');
          setInputPhone('13800138000'); // Mock phone from WeChat
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
      alert(`验证码已发送: 1234`);
  };

  const handleConfirmBind = () => {
      if (verifyCode === '1234') {
          setPhoneNumber(inputPhone);
          setIsBindingModalOpen(false);
          alert('手机号绑定成功！');
      } else {
          alert('验证码错误');
      }
  };

  const handleLogout = () => {
      logout();
      navigate('/login');
  };

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

  if (showAgreement) {
      return (
          <div className="min-h-screen bg-gray-50 pb-safe animate-in slide-in-from-right">
              <div className="bg-white px-4 py-3 flex items-center gap-4 sticky top-0 z-50 border-b border-gray-100">
                  <button onClick={() => setShowAgreement(false)} className="p-1 -ml-1 text-gray-600">
                      <ChevronLeft size={24} />
                  </button>
                  <h1 className="text-lg font-bold text-gray-900">用户协议与隐私政策</h1>
              </div>
              <div className="p-4 bg-white min-h-screen text-sm text-gray-600 leading-relaxed space-y-4">
                  <h3 className="font-bold text-gray-900 text-base">1. 服务条款</h3>
                  <p>欢迎使用 Spot On 约球平台。本协议是您与 Spot On 之间关于使用本平台服务所订立的协议。</p>
                  
                  <h3 className="font-bold text-gray-900 text-base">2. 隐私保护</h3>
                  <p>我们重视您的隐私保护。在使用我们的服务时，我们可能会收集和使用您的相关信息。我们将通过本隐私政策向您说明，我们在您使用我们的服务时如何收集、使用、储存和分享这些信息。</p>
                  
                  <h3 className="font-bold text-gray-900 text-base">3. 用户行为规范</h3>
                  <p>用户在使用本服务时，必须遵守中华人民共和国相关法律法规的规定，不得利用本服务进行任何违法或不正当的活动。</p>
                  
                  <h3 className="font-bold text-gray-900 text-base">4. 约球规则</h3>
                  <p>用户在发起或参与约球活动时，应遵守诚实守信原则。爽约、迟到等行为将影响您的信用评分。</p>
                  
                  <div className="text-xs text-gray-400 pt-8 text-center">
                      最后更新日期：2025年5月20日
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe relative">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-4 sticky top-0 z-50 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-600">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">设置</h1>
      </div>

      <div className="mt-4 space-y-4">
        {/* Account Security */}
        <div className="bg-white">
          <div className="px-4 py-2 text-xs text-gray-500 font-medium">账号与安全</div>
          <SettingsItem 
            icon={Smartphone} 
            label="手机号绑定" 
            value={phoneNumber || "未绑定"} 
            onClick={() => {
                setStep('wechat');
                setIsBindingModalOpen(true);
            }}
          />
        </div>

        {/* General */}
        <div className="bg-white">
          <div className="px-4 py-2 text-xs text-gray-500 font-medium">通用</div>
          <SettingsItem 
            icon={Bell} 
            label="消息通知" 
            onClick={() => setShowNotifications(true)}
          />
          <SettingsItem 
            icon={FileText} 
            label="用户协议与隐私政策" 
            onClick={() => setShowAgreement(true)}
          />
        </div>

        {/* Danger Zone */}
        <div className="bg-white mt-4">
             <button 
                onClick={() => setIsLogoutModalOpen(true)}
                className="w-full py-3 text-center text-red-500 font-medium active:bg-gray-50"
             >
                 退出登录
             </button>
        </div>
        
        <div className="text-center text-xs text-gray-300 py-4">
            Version 1.0.0 (Build 20250520)
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-xs rounded-xl p-6 space-y-4 animate-in zoom-in-95">
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

const SettingsItem: React.FC<{ icon: any, label: string, value?: string, onClick?: () => void }> = ({ icon: Icon, label, value, onClick }) => (
    <div 
        onClick={onClick}
        className="flex items-center justify-between px-4 py-3.5 bg-white active:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
    >
        <div className="flex items-center gap-3">
            <Icon size={18} className="text-gray-400" />
            <span className="text-sm text-gray-800">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className="text-xs text-gray-400">{value}</span>}
            <ChevronLeft size={16} className="text-gray-300 rotate-180" />
        </div>
    </div>
);

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
