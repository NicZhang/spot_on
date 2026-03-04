import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Smartphone, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const [loginMethod, setLoginMethod] = useState<'wechat' | 'phone'>('wechat');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [agreed, setAgreed] = useState(false);

  const handleWeChatLogin = () => {
    if (!agreed) {
      alert('请先阅读并同意用户协议与隐私政策');
      return;
    }
    // Mock WeChat Login
    setTimeout(() => {
      login();
      navigate('/');
    }, 1000);
  };

  const handleSendCode = () => {
    if (!phoneNumber) return;
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

  const handlePhoneLogin = () => {
    if (!agreed) {
      alert('请先阅读并同意用户协议与隐私政策');
      return;
    }
    if (verifyCode === '1234') {
      login();
      navigate('/');
    } else {
      alert('验证码错误');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 relative">
      {/* Logo Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs">
        <div className="w-24 h-24 bg-black rounded-3xl flex items-center justify-center mb-6 shadow-xl rotate-3">
          <span className="text-white font-bold text-3xl italic">SO</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Spot On 约球</h1>
        <p className="text-gray-500 text-sm">专业的业余足球约战平台</p>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-xs space-y-4 mb-12">
        {loginMethod === 'wechat' ? (
          <button 
            onClick={handleWeChatLogin}
            className="w-full bg-[#07c160] text-white font-bold py-3.5 rounded-full active:bg-[#06ad56] flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-transform active:scale-95"
          >
            <MessageSquare size={20} fill="currentColor" />
            微信一键登录
          </button>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <input 
                type="tel" 
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="请输入手机号"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-gray-900 focus:outline-none focus:border-black transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value)}
                placeholder="验证码"
                className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-gray-900 focus:outline-none focus:border-black transition-colors"
              />
              <button 
                disabled={countdown > 0 || !phoneNumber}
                onClick={handleSendCode}
                className={`px-4 rounded-xl text-sm font-medium transition-colors ${countdown > 0 || !phoneNumber ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}
              >
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>
            <button 
              onClick={handlePhoneLogin}
              className="w-full bg-black text-white font-bold py-3.5 rounded-full active:bg-gray-800 transition-transform active:scale-95 shadow-lg shadow-gray-200"
            >
              登录
            </button>
          </div>
        )}

        <div className="flex justify-center">
          <button 
            onClick={() => setLoginMethod(prev => prev === 'wechat' ? 'phone' : 'wechat')}
            className="text-sm text-gray-500 font-medium py-2 px-4 hover:bg-gray-50 rounded-full transition-colors"
          >
            {loginMethod === 'wechat' ? '手机号验证码登录' : '返回微信登录'}
          </button>
        </div>
      </div>

      {/* Agreement */}
      <div className="text-xs text-gray-400 flex items-center gap-2 mb-8">
        <button 
          onClick={() => setAgreed(!agreed)}
          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${agreed ? 'bg-black border-black' : 'border-gray-300'}`}
        >
          {agreed && <div className="w-2 h-2 bg-white rounded-full" />}
        </button>
        <span>
          我已阅读并同意 
          <span className="text-gray-900 font-medium mx-1">用户协议</span> 
          和 
          <span className="text-gray-900 font-medium mx-1">隐私政策</span>
        </span>
      </div>
    </div>
  );
};

export default Login;
