import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import NavBar from '../components/NavBar';
import { ShieldCheck, CheckCircle, Upload, Camera, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TeamVerification: React.FC = () => {
  const { myTeam, updateTeamInfo } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(myTeam.isVerified ? 'verified' : 'form'); // 'form', 'reviewing', 'verified'
  
  // Form State
  const [formData, setFormData] = useState({
      realName: '',
      idCard: '',
      phone: '',
      desc: ''
  });

  const handleSubmit = () => {
      if(!formData.realName || !formData.idCard || !formData.phone) {
          alert("请填写完整信息");
          return;
      }
      // Simulate API call
      setStep('reviewing');
      
      // Simulate auto-approval after 2 seconds for demo
      setTimeout(() => {
          updateTeamInfo({ isVerified: true });
          setStep('verified');
      }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      <NavBar title="球队认证" showBack={true} />
      
      {step === 'verified' && (
          <div className="p-6 flex flex-col items-center pt-12">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce-small">
                  <ShieldCheck size={48} className="text-[#07c160]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">已通过认证</h2>
              <p className="text-gray-500 text-center mb-8">
                  您的球队 <span className="font-bold text-gray-800">{myTeam.name}</span> 已获得官方认证标识
              </p>
              
              <div className="w-full bg-white rounded-xl p-6 shadow-sm mb-6">
                  <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">认证权益</h3>
                  <div className="space-y-4">
                      <div className="flex items-start gap-3">
                          <CheckCircle size={20} className="text-[#07c160] shrink-0 mt-0.5" />
                          <div>
                              <div className="font-medium text-gray-800">专属认证标识</div>
                              <div className="text-xs text-gray-500">在球队列表、约战卡片中展示V标</div>
                          </div>
                      </div>
                      <div className="flex items-start gap-3">
                          <CheckCircle size={20} className="text-[#07c160] shrink-0 mt-0.5" />
                          <div>
                              <div className="font-medium text-gray-800">优先匹配特权</div>
                              <div className="text-xs text-gray-500">系统优先推荐认证球队，约战成功率提升50%</div>
                          </div>
                      </div>
                      <div className="flex items-start gap-3">
                          <CheckCircle size={20} className="text-[#07c160] shrink-0 mt-0.5" />
                          <div>
                              <div className="font-medium text-gray-800">赛事报名资格</div>
                              <div className="text-xs text-gray-500">可报名参加平台举办的官方联赛</div>
                          </div>
                      </div>
                  </div>
              </div>

              <button 
                onClick={() => {
                    // Demo: Reset to unverified
                    updateTeamInfo({ isVerified: false });
                    setStep('form');
                }}
                className="text-gray-400 text-sm underline"
              >
                  (演示) 重置为未认证状态
              </button>
          </div>
      )}

      {step === 'reviewing' && (
          <div className="p-6 flex flex-col items-center pt-20">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">正在审核中...</h2>
              <p className="text-gray-500 text-center">
                  预计 1-3 个工作日内完成审核<br/>请留意系统通知
              </p>
          </div>
      )}

      {step === 'form' && (
          <div className="p-4">
              <div className="bg-orange-50 p-3 rounded-lg flex gap-2 mb-4">
                  <AlertCircle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-orange-700 leading-relaxed">
                      为构建诚信约球环境，队长需完成实名认证。信息仅用于审核，平台将严格保密。
                  </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm space-y-4 mb-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">真实姓名</label>
                      <input 
                        type="text" 
                        placeholder="请输入身份证上的姓名"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-[#07c160]"
                        value={formData.realName}
                        onChange={e => setFormData({...formData, realName: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">身份证号</label>
                      <input 
                        type="text" 
                        placeholder="请输入18位身份证号"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-[#07c160]"
                        value={formData.idCard}
                        onChange={e => setFormData({...formData, idCard: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                      <input 
                        type="tel" 
                        placeholder="请输入手机号码"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-[#07c160]"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">球队简介</label>
                      <textarea 
                        placeholder="简单介绍一下球队历史、风格等"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-[#07c160] min-h-[80px]"
                        value={formData.desc}
                        onChange={e => setFormData({...formData, desc: e.target.value})}
                      />
                  </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">上传认证材料</label>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="aspect-[3/2] bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors">
                          <Camera size={24} className="mb-2" />
                          <span className="text-xs">身份证人像面</span>
                      </div>
                      <div className="aspect-[3/2] bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors">
                          <Camera size={24} className="mb-2" />
                          <span className="text-xs">身份证国徽面</span>
                      </div>
                      <div className="aspect-[3/2] bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors col-span-2">
                          <Upload size={24} className="mb-2" />
                          <span className="text-xs">球队合影 / logo (选填)</span>
                      </div>
                  </div>
              </div>

              <button 
                onClick={handleSubmit}
                className="w-full bg-[#07c160] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-200 active:scale-[0.98] transition-transform"
              >
                  提交认证
              </button>
          </div>
      )}
    </div>
  );
};

export default TeamVerification;
