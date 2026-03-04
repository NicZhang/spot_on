import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { useApp } from '../context/AppContext';
import { ChevronRight, MapPin, Calendar, Clock, DollarSign, Users, Shirt, Zap, Car, Video, ShieldCheck, CheckSquare, Square, User, Hourglass, CornerDownRight, Check, AlertTriangle, ChevronLeft, Eye } from 'lucide-react';
import { MatchIntensity, GenderRequirement } from '../types';

/* ------------------------------------------------------------------ */
/*  Step indicator                                                     */
/* ------------------------------------------------------------------ */
const StepIndicator: React.FC<{ currentStep: number; totalSteps: number; labels: string[] }> = ({ currentStep, totalSteps, labels }) => (
  <div className="bg-white p-4 mb-2">
    <div className="flex items-center justify-between mb-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < currentStep ? 'bg-[#07c160] text-white' :
              i === currentStep ? 'bg-[#07c160] text-white ring-4 ring-[#07c160]/20' :
              'bg-gray-200 text-gray-400'
            }`}>
              {i < currentStep ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-[10px] mt-1 ${i <= currentStep ? 'text-[#07c160] font-medium' : 'text-gray-400'}`}>
              {labels[i]}
            </span>
          </div>
          {i < totalSteps - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentStep ? 'bg-[#07c160]' : 'bg-gray-200'}`}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Toast component                                                    */
/* ------------------------------------------------------------------ */
const Toast: React.FC<{ message: string; type?: 'success' | 'error'; visible: boolean }> = ({ message, type = 'success', visible }) => {
  if (!visible) return null;
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] animate-slide-down">
      <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${type === 'success' ? 'bg-[#07c160] text-white' : 'bg-red-500 text-white'}`}>
        {type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
        {message}
      </div>
    </div>
  );
};

const CreateMatch: React.FC = () => {
  const navigate = useNavigate();
  const { createMatch, players, myTeam } = useApp();

  // Step management (0-indexed)
  const [currentStep, setCurrentStep] = useState(0);
  const stepLabels = ['时间', '场地', '赛制', '费用', '服务', '确认'];

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({ message: '', type: 'success', visible: false });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
  };

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form State
  const [formData, setFormData] = useState({
    location: '',
    fieldName: '',
    date: '',
    time: '',
    duration: 120,
    format: '7人制',
    desc: '',
    amenities: [] as string[],
    jerseyColor: myTeam.homeJerseyColor || '#3b82f6',
    intensity: '养生局' as MatchIntensity,
    genderReq: 'any' as GenderRequirement,
  });

  // Cost State
  const [costs, setCosts] = useState({
    pitchFee: '' as string,
    hasReferee: false,
    refereeFee: '' as string,
    hasWater: false,
    waterFee: '' as string,
  });

  // VAS State
  const [vas, setVas] = useState({
    videoService: false,
    insurancePlayerIds: [] as string[]
  });

  // VIP urgent toggle
  const [urgentEnabled, setUrgentEnabled] = useState(false);

  const INSURANCE_PRICE = 5;
  const VIDEO_PRICE = 29.9;

  // Derived Totals
  const pitchFee = parseInt(costs.pitchFee) || 0;
  const refereeFee = costs.hasReferee ? (parseInt(costs.refereeFee) || 0) : 0;
  const waterFee = costs.hasWater ? (parseInt(costs.waterFee) || 0) : 0;
  const totalMatchCost = pitchFee + refereeFee + waterFee;
  const insuranceCost = vas.insurancePlayerIds.length * INSURANCE_PRICE;

  const colors = [
    { name: '蓝', hex: '#3b82f6' },
    { name: '红', hex: '#ef4444' },
    { name: '白', hex: '#ffffff' },
    { name: '黑', hex: '#000000' },
    { name: '黄', hex: '#eab308' },
    { name: '绿', hex: '#22c55e' },
  ];

  const fieldAmenities = ['免费停车', '更衣室', '夜场灯光'];
  const intensityOptions: MatchIntensity[] = ['养生局', '竞技局', '激战局'];

  const toggleAmenity = (item: string) => {
    setFormData(prev => ({
        ...prev,
        amenities: prev.amenities.includes(item)
            ? prev.amenities.filter(i => i !== item)
            : [...prev.amenities, item]
    }));
  };

  const toggleInsurancePlayer = (playerId: string) => {
    setVas(prev => ({
        ...prev,
        insurancePlayerIds: prev.insurancePlayerIds.includes(playerId)
            ? prev.insurancePlayerIds.filter(id => id !== playerId)
            : [...prev.insurancePlayerIds, playerId]
    }));
  };

  // Validation per step
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.date) newErrors.date = '请选择日期';
      if (!formData.time) newErrors.time = '请选择开球时间';
    }
    if (step === 1) {
      if (!formData.location) newErrors.location = '请填写球场地点';
    }
    if (step === 3) {
      if (!costs.pitchFee || parseInt(costs.pitchFee) <= 0) newErrors.pitchFee = '请填写场地费';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, stepLabels.length - 1));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = () => {
    // Final validation
    if (!formData.location || !formData.date || !formData.time || !costs.pitchFee) {
      showToast('请填写完整场地信息和费用', 'error');
      return;
    }

    const dateObj = new Date(formData.date);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[dateObj.getDay()];
    const dateStr = `${weekday} ${formData.time}`;

    const fullLocation = formData.fieldName
        ? `${formData.location} - ${formData.fieldName}`
        : formData.location;

    createMatch({
      dateStr: dateStr,
      isoDate: formData.date,
      duration: formData.duration,
      format: formData.format,
      location: fullLocation,
      costBreakdown: {
          pitchFee,
          refereeFee,
          waterFee
      },
      amenities: formData.amenities,
      jerseyColor: formData.jerseyColor,
      intensity: formData.intensity,
      genderReq: formData.genderReq,
      vas: vas
    });

    showToast('约球发布成功！');
    setTimeout(() => navigate('/'), 1500);
  };

  // Date display helper
  const getDateDisplay = () => {
    if (!formData.date) return '';
    const d = new Date(formData.date);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
  };

  /* ================================================================ */
  /*  Render helpers per step                                          */
  /* ================================================================ */

  const renderStep0_DateTime = () => (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      {/* Date */}
      <div className="flex items-center p-4 border-b border-gray-100">
          <div className="w-8">
              <Calendar size={20} className="text-[#07c160]" />
          </div>
          <div className="flex-1">
               <div className="text-xs text-gray-500 mb-1">日期 <span className="text-red-400">*</span></div>
               <input
                  type="date"
                  className={`w-full text-base font-medium outline-none bg-transparent ${errors.date ? 'text-red-500' : ''}`}
                  value={formData.date}
                  onChange={(e) => { setFormData({...formData, date: e.target.value}); setErrors(prev => { const {date, ...rest} = prev; return rest; }); }}
              />
              {errors.date && <div className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={10} /> {errors.date}</div>}
              {formData.date && <div className="text-xs text-[#07c160] mt-1">{getDateDisplay()}</div>}
          </div>
      </div>

       {/* Time */}
       <div className="flex items-center p-4 border-b border-gray-100">
          <div className="w-8">
              <Clock size={20} className="text-[#07c160]" />
          </div>
          <div className="flex-1">
               <div className="text-xs text-gray-500 mb-1">开球时间 <span className="text-red-400">*</span></div>
               <input
                  type="time"
                  className={`w-full text-base font-medium outline-none bg-transparent ${errors.time ? 'text-red-500' : ''}`}
                  value={formData.time}
                  onChange={(e) => { setFormData({...formData, time: e.target.value}); setErrors(prev => { const {time, ...rest} = prev; return rest; }); }}
              />
              {errors.time && <div className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={10} /> {errors.time}</div>}
          </div>
      </div>

       {/* Duration Selector */}
       <div className="flex items-center p-4">
          <div className="w-8 self-start mt-2">
              <Hourglass size={20} className="text-[#07c160]" />
          </div>
          <div className="flex-1">
               <div className="text-xs text-gray-500 mb-2">比赛时长</div>
               <div className="flex flex-wrap gap-2">
                   {[60, 90, 120, 150, 180].map(mins => (
                       <button
                          key={mins}
                          onClick={() => setFormData({...formData, duration: mins})}
                          className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${formData.duration === mins ? 'bg-[#07c160] text-white border-[#07c160]' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                       >
                           {mins/60}小时
                       </button>
                   ))}
               </div>
          </div>
      </div>
    </div>
  );

  const renderStep1_Location = () => (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      {/* Location (Venue) */}
      <div className="flex items-center p-4 border-b border-gray-100">
          <div className="w-8">
              <MapPin size={20} className="text-[#07c160]" />
          </div>
          <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">球场地点 <span className="text-red-400">*</span></div>
              <input
                  type="text"
                  placeholder="选择或输入球场 (如：奥体中心)"
                  className={`w-full text-base font-medium outline-none placeholder-gray-300 ${errors.location ? 'text-red-500' : ''}`}
                  value={formData.location}
                  onChange={(e) => { setFormData({...formData, location: e.target.value}); setErrors(prev => { const {location, ...rest} = prev; return rest; }); }}
              />
              {errors.location && <div className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={10} /> {errors.location}</div>}
          </div>
          <ChevronRight size={20} className="text-gray-300" />
      </div>

      {/* Field Name (Sub-item) */}
      <div className="flex items-center p-4 bg-gray-50/50">
          <div className="w-8 flex justify-center text-gray-300">
              <CornerDownRight size={20} />
          </div>
          <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">具体场地 <span className="text-[10px] text-gray-400 font-normal">(选填)</span></div>
              <input
                  type="text"
                  placeholder="例如：5号场、北侧真草"
                  className="w-full text-base font-medium outline-none bg-transparent placeholder-gray-300"
                  value={formData.fieldName}
                  onChange={(e) => setFormData({...formData, fieldName: e.target.value})}
              />
          </div>
      </div>
    </div>
  );

  const renderStep2_MatchConfig = () => (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-6">
      {/* Format */}
      <div>
          <div className="flex items-center gap-2 mb-3">
              <Users size={18} className="text-gray-400" />
              <span className="font-bold text-gray-800">赛制</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
              {['5人制', '7人制', '8人制', '11人制'].map(fmt => (
                  <button
                      key={fmt}
                      onClick={() => setFormData({...formData, format: fmt})}
                      className={`py-2.5 text-sm rounded-lg border font-medium transition-colors ${formData.format === fmt ? 'bg-[#07c160] text-white border-[#07c160]' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                  >
                      {fmt}
                  </button>
              ))}
          </div>
      </div>

      {/* Intensity */}
      <div>
           <div className="flex items-center gap-2 mb-3">
              <Zap size={18} className="text-gray-400" />
              <span className="font-bold text-gray-800">对抗强度</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
               {intensityOptions.map(opt => (
                  <button
                      key={opt}
                      onClick={() => setFormData({...formData, intensity: opt})}
                      className={`py-2.5 text-sm rounded-lg border font-medium transition-colors ${formData.intensity === opt ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                  >
                      {opt}
                  </button>
              ))}
          </div>
      </div>

      {/* Gender Requirement */}
      <div>
           <div className="flex items-center gap-2 mb-3">
              <User size={18} className="text-gray-400" />
              <span className="font-bold text-gray-800">对手性别</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
               {[
                   { value: 'any', label: '不限' },
                   { value: 'male', label: '仅男足' },
                   { value: 'female', label: '仅女足' }
               ].map(opt => (
                  <button
                      key={opt.value}
                      onClick={() => setFormData({...formData, genderReq: opt.value as GenderRequirement})}
                      className={`py-2.5 text-sm rounded-lg border font-medium transition-colors ${formData.genderReq === opt.value ? 'bg-[#07c160] text-white border-[#07c160]' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                  >
                      {opt.label}
                  </button>
              ))}
          </div>
      </div>

      {/* Jersey Color */}
      <div>
           <div className="flex items-center gap-2 mb-3">
              <Shirt size={18} className="text-gray-400" />
              <span className="font-bold text-gray-800">我方球衣 <span className="text-xs font-normal text-gray-400 ml-1">(避免撞衫)</span></span>
          </div>
          <div className="flex gap-4 items-center">
               {colors.map(color => (
                  <button
                      key={color.hex}
                      onClick={() => setFormData({...formData, jerseyColor: color.hex})}
                      className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${formData.jerseyColor === color.hex ? 'border-gray-800 scale-110 ring-2 ring-gray-100' : 'border-transparent'}`}
                  >
                      <div className="w-7 h-7 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color.hex }}></div>
                  </button>
              ))}
          </div>
      </div>

      {/* Facilities */}
      <div>
          <div className="flex items-center gap-2 mb-3">
              <Car size={18} className="text-gray-400" />
              <span className="font-bold text-gray-800">场地设施 <span className="text-xs font-normal text-gray-400 ml-1">(免费)</span></span>
          </div>
          <div className="flex flex-wrap gap-2">
              {fieldAmenities.map(item => (
                  <button
                      key={item}
                      onClick={() => toggleAmenity(item)}
                      className={`px-3 py-1.5 text-sm rounded border transition-colors ${formData.amenities.includes(item) ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-500 border-gray-200'}`}
                  >
                      {item}
                  </button>
              ))}
          </div>
      </div>
    </div>
  );

  const renderStep3_Cost = () => (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm p-5">
      <div className="flex items-center gap-2 mb-5">
          <DollarSign size={18} className="text-yellow-500" />
          <span className="font-bold text-gray-800">费用明细 <span className="text-xs font-normal text-gray-400">(用于AA计算)</span></span>
      </div>

      <div className="space-y-4">
          {/* Pitch Fee */}
          <div>
            <div className="flex items-center justify-between">
                <span className="text-base text-gray-700">场地费 <span className="text-red-400 text-xs">*</span></span>
                <div className="flex items-center gap-1 w-28 border-b border-gray-200 pb-1">
                    <span className="text-gray-400">¥</span>
                    <input
                        type="number"
                        placeholder="0"
                        className={`w-full text-right outline-none font-bold text-lg ${errors.pitchFee ? 'text-red-500' : ''}`}
                        value={costs.pitchFee}
                        onChange={(e) => { setCosts({...costs, pitchFee: e.target.value}); setErrors(prev => { const {pitchFee, ...rest} = prev; return rest; }); }}
                    />
                </div>
            </div>
            {errors.pitchFee && <div className="text-xs text-red-500 mt-1 text-right flex items-center justify-end gap-1"><AlertTriangle size={10} /> {errors.pitchFee}</div>}
          </div>

          {/* Referee Fee */}
          <div className="flex items-center justify-between">
              <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setCosts({...costs, hasReferee: !costs.hasReferee})}
              >
                  {costs.hasReferee ? <CheckSquare size={20} className="text-[#07c160]" /> : <Square size={20} className="text-gray-300" />}
                  <span className="text-base text-gray-700">聘请裁判</span>
              </div>
              {costs.hasReferee && (
                  <div className="flex items-center gap-1 w-28 border-b border-gray-200 pb-1">
                      <span className="text-gray-400">¥</span>
                      <input
                          type="number"
                          placeholder="0"
                          className="w-full text-right outline-none font-bold text-lg"
                          value={costs.refereeFee}
                          onChange={(e) => setCosts({...costs, refereeFee: e.target.value})}
                      />
                  </div>
              )}
          </div>

          {/* Water Fee */}
          <div className="flex items-center justify-between">
              <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setCosts({...costs, hasWater: !costs.hasWater})}
              >
                  {costs.hasWater ? <CheckSquare size={20} className="text-[#07c160]" /> : <Square size={20} className="text-gray-300" />}
                  <span className="text-base text-gray-700">提供饮水</span>
              </div>
              {costs.hasWater && (
                  <div className="flex items-center gap-1 w-28 border-b border-gray-200 pb-1">
                      <span className="text-gray-400">¥</span>
                      <input
                          type="number"
                          placeholder="0"
                          className="w-full text-right outline-none font-bold text-lg"
                          value={costs.waterFee}
                          onChange={(e) => setCosts({...costs, waterFee: e.target.value})}
                      />
                  </div>
              )}
          </div>

          {/* Auto-calculating Total Summary */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">场地费</span>
                <span className="text-sm font-mono text-gray-700">¥{pitchFee}</span>
              </div>
              {costs.hasReferee && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">裁判费</span>
                  <span className="text-sm font-mono text-gray-700">¥{refereeFee}</span>
                </div>
              )}
              {costs.hasWater && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">饮水费</span>
                  <span className="text-sm font-mono text-gray-700">¥{waterFee}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">总费用</span>
                <span className="text-lg font-bold font-mono text-gray-900">¥{totalMatchCost}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-400">* 对手需分摊 50%</span>
                <span className="text-base font-bold text-[#07c160]">人均/AA ¥{(totalMatchCost / 2).toFixed(0)}</span>
              </div>
            </div>
          </div>
      </div>
    </div>
  );

  const renderStep4_VAS = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl overflow-hidden shadow-sm p-5">
           <div className="flex items-center gap-2 mb-5">
              <Zap size={18} className="text-purple-500" />
              <span className="font-bold text-gray-800">平台增值服务</span>
          </div>

          <div className="space-y-4">
              {/* Video Service */}
              <div className="flex flex-col p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                   <div className="flex justify-between items-start mb-3">
                       <div className="flex items-center gap-2">
                           <div className="bg-purple-100 p-1.5 rounded-lg">
                               <Video size={20} className="text-purple-600" />
                           </div>
                           <span className="font-bold text-gray-800">专业录像 AI 剪辑</span>
                       </div>
                       <button
                         onClick={() => setVas({...vas, videoService: !vas.videoService})}
                         className={`w-11 h-6 rounded-full transition-colors relative ${vas.videoService ? 'bg-[#07c160]' : 'bg-gray-200'}`}
                       >
                         <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${vas.videoService ? 'translate-x-5' : 'translate-x-0'}`} />
                       </button>
                   </div>
                   <p className="text-xs text-gray-500 leading-relaxed mb-2">
                      上传比赛全程录像，平台 AI 自动识别进球、过人等高光时刻，生成精彩集锦。
                   </p>
                   {vas.videoService && <div className="text-xs font-bold text-purple-600 bg-white inline-block self-start px-2 py-1 rounded border border-purple-100">本队支付 +¥{VIDEO_PRICE} (不计入AA)</div>}
              </div>

              {/* Insurance Service */}
              <div className="flex flex-col p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                   <div className="flex justify-between items-start mb-3">
                       <div className="flex items-center gap-2">
                           <div className="bg-blue-100 p-1.5 rounded-lg">
                               <ShieldCheck size={20} className="text-blue-600" />
                           </div>
                           <span className="font-bold text-gray-800">单次运动意外险</span>
                       </div>
                       <span className="text-sm font-bold text-blue-600">¥{INSURANCE_PRICE}/人</span>
                   </div>
                   <p className="text-xs text-gray-500 mb-3">
                      为特定球员购买单场保险（身故/猝死/意外医疗），费用计入球员账单。
                   </p>

                   {/* Player Selector */}
                   <div className="bg-white rounded-xl p-3 border border-blue-100 grid grid-cols-4 gap-3">
                       {players.map(player => (
                           <div
                              key={player.id}
                              onClick={() => toggleInsurancePlayer(player.id)}
                              className={`flex flex-col items-center p-2 rounded-lg cursor-pointer border transition-all ${vas.insurancePlayerIds.includes(player.id) ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-transparent hover:bg-gray-50'}`}
                           >
                               <div className="relative mb-1">
                                   <img src={player.avatar} className="w-10 h-10 rounded-full bg-gray-200 object-cover" alt={player.name} />
                                   {vas.insurancePlayerIds.includes(player.id) && (
                                       <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-[2px] ring-2 ring-white">
                                           <CheckSquare size={10} />
                                       </div>
                                   )}
                               </div>
                               <span className="text-[10px] text-gray-600 truncate w-full text-center">{player.name}</span>
                           </div>
                       ))}
                   </div>
                   {insuranceCost > 0 && <div className="text-right text-sm text-blue-600 font-bold mt-3">保险总计: ¥{insuranceCost}</div>}
              </div>
          </div>
      </div>

      {/* Memo */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm p-4">
          <textarea
              className="w-full h-24 outline-none text-base placeholder-gray-300 resize-none"
              placeholder="填写备注信息... (例如：草皮状况、是否接受单飞、停车位置等)"
              value={formData.desc}
              onChange={(e) => setFormData({...formData, desc: e.target.value})}
          ></textarea>
      </div>

      {/* VIP Urgent Option */}
      <div
          className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100 flex items-center justify-between"
      >
          <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                  <Zap size={20} fill="currentColor" />
              </div>
              <div>
                  <div className="font-bold text-gray-900 flex items-center gap-2">
                      加急置顶发布
                      <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 rounded">VIP</span>
                  </div>
                  <div className="text-xs text-gray-500">每日1次免费置顶，智能推送给匹配对手</div>
              </div>
          </div>
          <button
            onClick={() => { setUrgentEnabled(!urgentEnabled); showToast(urgentEnabled ? '已关闭加急置顶' : 'VIP功能：已开启加急置顶！'); }}
            className={`w-11 h-6 rounded-full transition-colors relative ${urgentEnabled ? 'bg-[#07c160]' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${urgentEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
      </div>
    </div>
  );

  const renderStep5_Preview = () => (
    <div className="space-y-4">
      {/* Preview Header */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={18} className="text-[#07c160]" />
          <span className="font-bold text-gray-800">发布预览</span>
        </div>

        <div className="space-y-4">
          {/* Date & Time */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar size={18} className="text-[#07c160]" />
            <div>
              <div className="text-sm font-bold text-gray-900">{getDateDisplay()} {formData.time}</div>
              <div className="text-xs text-gray-500">{formData.duration / 60}小时</div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <MapPin size={18} className="text-[#07c160]" />
            <div>
              <div className="text-sm font-bold text-gray-900">{formData.location}</div>
              {formData.fieldName && <div className="text-xs text-gray-500">{formData.fieldName}</div>}
            </div>
          </div>

          {/* Config */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-[#07c160]/10 text-[#07c160] px-2.5 py-1 rounded-full font-medium">{formData.format}</span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">{formData.intensity}</span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
              {formData.genderReq === 'any' ? '不限性别' : formData.genderReq === 'male' ? '仅男足' : '仅女足'}
            </span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: formData.jerseyColor }}></div>
              球衣
            </span>
          </div>

          {/* Amenities */}
          {formData.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.amenities.map(a => (
                <span key={a} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">{a}</span>
              ))}
            </div>
          )}

          {/* Cost Summary */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-500">场地费</span>
              <span className="text-sm font-mono">¥{pitchFee}</span>
            </div>
            {refereeFee > 0 && (
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-500">裁判费</span>
                <span className="text-sm font-mono">¥{refereeFee}</span>
              </div>
            )}
            {waterFee > 0 && (
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-500">饮水费</span>
                <span className="text-sm font-mono">¥{waterFee}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-2">
              <span className="text-sm font-bold text-gray-900">总费用</span>
              <span className="text-lg font-bold text-[#07c160] font-mono">¥{totalMatchCost}</span>
            </div>
            <div className="text-right text-xs text-gray-400 mt-1">对手分摊 50% = 人均 ¥{(totalMatchCost / 2).toFixed(0)}</div>
          </div>

          {/* VAS */}
          {(vas.videoService || vas.insurancePlayerIds.length > 0) && (
            <div className="border-t border-gray-100 pt-3">
              <div className="text-xs text-gray-500 mb-2">增值服务</div>
              {vas.videoService && <div className="text-xs text-purple-600 mb-1">AI 录像剪辑 +¥{VIDEO_PRICE}</div>}
              {vas.insurancePlayerIds.length > 0 && <div className="text-xs text-blue-600">意外险 x{vas.insurancePlayerIds.length}人 = ¥{insuranceCost}</div>}
            </div>
          )}

          {formData.desc && (
            <div className="border-t border-gray-100 pt-3">
              <div className="text-xs text-gray-500 mb-1">备注</div>
              <div className="text-sm text-gray-700">{formData.desc}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep0_DateTime();
      case 1: return renderStep1_Location();
      case 2: return renderStep2_MatchConfig();
      case 3: return renderStep3_Cost();
      case 4: return renderStep4_VAS();
      case 5: return renderStep5_Preview();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-32">
      <NavBar title="发起约球" showBack={true} />

      {/* Toast */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} totalSteps={stepLabels.length} labels={stepLabels} />

      {/* Step Content */}
      <div className="p-4 space-y-4">
        {renderCurrentStep()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 flex gap-3 z-30" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {currentStep > 0 && (
          <button
            onClick={handlePrevStep}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-base active:bg-gray-200 flex items-center justify-center gap-1 transition-colors"
          >
            <ChevronLeft size={18} />
            上一步
          </button>
        )}
        {currentStep < stepLabels.length - 1 ? (
          <button
            onClick={handleNextStep}
            className="flex-1 bg-[#07c160] active:bg-[#06ad56] text-white py-3 rounded-xl font-bold text-base transition-transform active:scale-[0.99] flex items-center justify-center gap-1"
          >
            下一步
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="flex-1 bg-[#07c160] active:bg-[#06ad56] text-white py-3 rounded-xl font-bold text-base shadow-xl shadow-green-100 transition-transform active:scale-[0.99]"
          >
            发布约球
          </button>
        )}
      </div>
    </div>
  );
};

export default CreateMatch;