import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { useApp } from '../context/AppContext';
import { ChevronRight, MapPin, Calendar, Clock, DollarSign, Users, Shirt, Zap, Car, Video, ShieldCheck, CheckSquare, Square, User, Hourglass, CornerDownRight } from 'lucide-react';
import { MatchIntensity, GenderRequirement } from '../types';

const CreateMatch: React.FC = () => {
  const navigate = useNavigate();
  const { createMatch, players, myTeam } = useApp();
  
  // Form State
  const [formData, setFormData] = useState({
    location: '',
    fieldName: '', // Specific field number/name
    date: '',
    time: '',
    duration: 120, // Default 2 hours (minutes)
    format: '7人制',
    desc: '',
    amenities: [] as string[],
    jerseyColor: myTeam.homeJerseyColor || '#3b82f6', // Default to Home Kit
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

  const INSURANCE_PRICE = 5; // 5 yuan per person
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

  const handleSubmit = () => {
    if (!formData.location || !formData.date || !formData.time || !costs.pitchFee) {
      alert('请填写完整场地信息和费用');
      return;
    }

    const dateObj = new Date(formData.date);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[dateObj.getDay()];
    const dateStr = `${weekday} ${formData.time}`;

    // Combine location and field name
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

    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      <NavBar title="发起约球" showBack={true} />
      
      <div className="p-4 space-y-4">
        {/* Block 1: Date, Time, Duration, Location */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
             {/* Date */}
            <div className="flex items-center p-4 border-b border-gray-100">
                <div className="w-8">
                    <Calendar size={20} className="text-[#07c160]" />
                </div>
                <div className="flex-1">
                     <div className="text-xs text-gray-500 mb-1">日期</div>
                     <input 
                        type="date" 
                        className="w-full text-base font-medium outline-none bg-transparent"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                </div>
                <ChevronRight size={20} className="text-gray-300" />
            </div>

             {/* Time */}
             <div className="flex items-center p-4 border-b border-gray-100">
                <div className="w-8">
                    <Clock size={20} className="text-[#07c160]" />
                </div>
                <div className="flex-1">
                     <div className="text-xs text-gray-500 mb-1">开球时间</div>
                     <input 
                        type="time" 
                        className="w-full text-base font-medium outline-none bg-transparent"
                        value={formData.time}
                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                    />
                </div>
                <ChevronRight size={20} className="text-gray-300" />
            </div>

             {/* Duration Selector */}
             <div className="flex items-center p-4 border-b border-gray-100">
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

            {/* Location (Venue) */}
            <div className="flex items-center p-4 border-b border-gray-100">
                <div className="w-8">
                    <MapPin size={20} className="text-[#07c160]" />
                </div>
                <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">球场地点</div>
                    <input 
                        type="text" 
                        placeholder="选择或输入球场 (如：奥体中心)"
                        className="w-full text-base font-medium outline-none placeholder-gray-300"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
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

        {/* Block 2: Match Configs (Format, Intensity, Jersey, Amenities) */}
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

        {/* Block 3: Cost Breakdown */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
                <DollarSign size={18} className="text-yellow-500" />
                <span className="font-bold text-gray-800">费用明细 <span className="text-xs font-normal text-gray-400">(用于AA计算)</span></span>
            </div>

            <div className="space-y-4">
                {/* Pitch Fee */}
                <div className="flex items-center justify-between">
                    <span className="text-base text-gray-700">场地费</span>
                    <div className="flex items-center gap-1 w-28 border-b border-gray-200 pb-1">
                        <span className="text-gray-400">¥</span>
                        <input 
                            type="number" 
                            placeholder="0"
                            className="w-full text-right outline-none font-bold text-lg"
                            value={costs.pitchFee}
                            onChange={(e) => setCosts({...costs, pitchFee: e.target.value})}
                        />
                    </div>
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

                {/* Total Summary */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-end">
                    <div className="text-xs text-gray-400">
                        * 自动计算：对手需分摊 50%
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500 mb-1">总费用 ¥{totalMatchCost}</div>
                        <div className="text-xl font-bold text-[#07c160]">人均/AA ¥{(totalMatchCost / 2).toFixed(0)}</div>
                    </div>
                </div>
            </div>
        </div>

        {/* Block 4: VAS */}
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
                         <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                            <input 
                                type="checkbox" 
                                name="toggle" 
                                id="toggle-video" 
                                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 checked:border-[#07c160]"
                                style={{ right: vas.videoService ? '0' : 'auto', left: vas.videoService ? 'auto' : '0', borderColor: vas.videoService ? '#07c160' : '#e5e7eb' }}
                                checked={vas.videoService}
                                onChange={() => setVas({...vas, videoService: !vas.videoService})}
                            />
                            <label htmlFor="toggle-video" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${vas.videoService ? 'bg-[#07c160]' : 'bg-gray-300'}`}></label>
                        </div>
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
        <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-4 p-4">
            <textarea 
                className="w-full h-24 outline-none text-base placeholder-gray-300 resize-none" 
                placeholder="填写备注信息... (例如：草皮状况、是否接受单飞、停车位置等)"
                value={formData.desc}
                onChange={(e) => setFormData({...formData, desc: e.target.value})}
            ></textarea>
        </div>

        {/* VIP Urgent Option */}
        <div 
            className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 mb-8 border border-amber-100 flex items-center justify-between"
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
            <div className="relative inline-block w-10 align-middle select-none">
                <input 
                    type="checkbox" 
                    checked={false} // Mock state
                    onChange={() => {
                        // Mock toggle
                        alert("VIP功能：已开启加急置顶！(模拟)");
                    }}
                    className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                    style={{ right: 'auto', left: '0', borderColor: '#e5e7eb' }}
                />
                <label className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-300 cursor-pointer"></label>
            </div>
        </div>

        {/* Submit */}
        <button 
            onClick={handleSubmit}
            className="w-full bg-[#07c160] active:bg-[#06ad56] text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-100 mb-4 transition-transform active:scale-[0.99]"
        >
            发布约球
        </button>
      </div>
    </div>
  );
};

export default CreateMatch;