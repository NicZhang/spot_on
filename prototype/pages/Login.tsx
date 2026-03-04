import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  // Entry animations
  const [logoVisible, setLogoVisible] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLogoVisible(true), 100);
    const t2 = setTimeout(() => setButtonVisible(true), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleWeChatLogin = () => {
    if (!agreed) {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      login();
      navigate('/');
    }, 1200);
  };

  const handlePhoneLogin = () => {
    if (!agreed) {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      login();
      navigate('/');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-gray-100 flex flex-col items-center relative overflow-hidden">

      {/* Subtle background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#07c160]/5 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />

      {/* Logo Area */}
      <div
        className={`flex-1 flex flex-col items-center justify-center w-full max-w-xs transition-all duration-700 ease-out ${
          logoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="w-24 h-24 bg-black rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-black/20 rotate-3">
          <span className="text-white font-bold text-3xl italic">SO</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1.5 tracking-tight">Spot On 约球</h1>
        <p className="text-gray-400 text-sm">业余足球约球平台</p>
      </div>

      {/* Buttons Area */}
      <div
        className={`w-full max-w-xs space-y-4 mb-8 px-6 transition-all duration-700 ease-out delay-200 ${
          buttonVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Main CTA - WeChat Login */}
        <button
          onClick={handleWeChatLogin}
          disabled={isLoading}
          className="w-full bg-[#07c160] text-white font-bold py-4 rounded-xl active:bg-[#06ad56] flex items-center justify-center gap-2.5 shadow-lg shadow-green-200/60 transition-all active:scale-[0.98] disabled:opacity-70 text-base"
        >
          {isLoading ? (
            <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <MessageSquare size={20} fill="currentColor" />
              微信一键登录
            </>
          )}
        </button>

        {/* Secondary - Phone login */}
        <div className="flex justify-center">
          <button
            onClick={handlePhoneLogin}
            disabled={isLoading}
            className="text-sm text-gray-400 font-medium py-2 px-4 transition-colors active:text-gray-600 disabled:opacity-50"
          >
            手机号登录
          </button>
        </div>
      </div>

      {/* Agreement Error Toast */}
      {showError && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/75 text-white text-sm px-6 py-3 rounded-lg shadow-xl animate-fade-in backdrop-blur-sm">
          请先同意用户协议与隐私政策
        </div>
      )}

      {/* Agreement */}
      <div className="pb-10 px-8 w-full max-w-xs">
        <div className="flex items-start gap-2.5">
          <button
            onClick={() => setAgreed(!agreed)}
            className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${
              agreed
                ? 'bg-[#07c160] border-[#07c160]'
                : showError
                  ? 'border-red-400 animate-shake'
                  : 'border-gray-300'
            }`}
          >
            {agreed && <Check size={12} className="text-white" strokeWidth={3} />}
          </button>
          <span className="text-xs text-gray-400 leading-relaxed">
            我已阅读并同意{' '}
            <span className="text-[#07c160] font-medium">用户协议</span>
            {' '}和{' '}
            <span className="text-[#07c160] font-medium">隐私政策</span>
          </span>
        </div>
      </div>

      {/* Inline keyframe style for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Login;
