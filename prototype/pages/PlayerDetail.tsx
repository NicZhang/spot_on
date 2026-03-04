import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { useApp } from '../context/AppContext';
import { Camera, Save, User, Smartphone, Ruler, Weight as WeightIcon, Footprints, Medal } from 'lucide-react';
import { PlayerLevel, StrongFoot } from '../types';

const PlayerDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { players, updatePlayer } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const player = players.find(p => p.id === id);

  const [formData, setFormData] = useState({
    name: '',
    number: '' as string | number,
    position: '自由人',
    height: '' as string | number,
    weight: '' as string | number,
    strongFoot: 'right' as StrongFoot,
    level: '业余' as PlayerLevel,
    phone: '',
    avatar: ''
  });

  useEffect(() => {
    if (player) {
      setFormData({
        name: player.name,
        number: player.number,
        position: player.position,
        height: player.height || '',
        weight: player.weight || '',
        strongFoot: player.strongFoot || 'right',
        level: player.level || '业余',
        phone: player.phone || '',
        avatar: player.avatar
      });
    }
  }, [player]);

  if (!player) return <div>Player not found</div>;

  const handleSave = () => {
    updatePlayer(player.id, {
      name: formData.name,
      number: Number(formData.number),
      position: formData.position,
      height: formData.height ? Number(formData.height) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined,
      strongFoot: formData.strongFoot,
      level: formData.level,
      phone: formData.phone,
      avatar: formData.avatar
    });
    navigate(-1);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const positions = ['前锋', '中场', '后卫', '门将', '自由人'];
  const levels: PlayerLevel[] = ['入门', '业余', '校队', '青训', '退役职业'];

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <NavBar title="队员档案" showBack={true} />

      <div className="p-4 space-y-4">
        
        {/* Avatar Section */}
        <div className="bg-white rounded-xl p-6 flex flex-col items-center justify-center space-y-3 relative overflow-hidden">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <img 
                    src={formData.avatar} 
                    alt="Player Avatar" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 group-hover:opacity-80 transition-opacity" 
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white drop-shadow-md" size={32} />
                </div>
                <div className="absolute bottom-0 right-0 bg-[#07c160] text-white p-1.5 rounded-full border-2 border-white">
                    <Camera size={14} />
                </div>
            </div>
            <div className="text-center">
                 <h2 className="text-lg font-bold text-gray-900">{formData.name}</h2>
                 <p className="text-xs text-gray-500">点击头像更换照片</p>
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
            />
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-xl overflow-hidden px-4 py-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-4 mb-2">基础信息</h3>
            
            <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4 mb-4">
                 <div>
                    <label className="text-xs text-gray-500 mb-1 block">姓名 / 昵称</label>
                    <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-gray-50 p-3 rounded-lg outline-none text-gray-900 text-sm font-medium"
                    />
                 </div>
                 <div>
                    <label className="text-xs text-gray-500 mb-1 block">球衣号码</label>
                    <input 
                        type="number" 
                        value={formData.number}
                        onChange={(e) => setFormData({...formData, number: e.target.value})}
                        className="w-full bg-gray-50 p-3 rounded-lg outline-none text-gray-900 text-sm font-bold font-mono"
                    />
                 </div>
            </div>

            <div className="mb-4">
                 <label className="text-xs text-gray-500 mb-2 block">场上位置</label>
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                    {positions.map(pos => (
                        <button
                            key={pos}
                            onClick={() => setFormData({...formData, position: pos})}
                            className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${formData.position === pos ? 'bg-white text-[#07c160] shadow-sm' : 'text-gray-500'}`}
                        >
                            {pos}
                        </button>
                    ))}
                 </div>
            </div>
            
             <div className="pb-4">
                <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Smartphone size={12}/> 联系电话 <span className="text-[10px] text-gray-300">(仅队长可见)</span></label>
                <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="请输入手机号"
                    className="w-full bg-gray-50 p-3 rounded-lg outline-none text-gray-900 text-sm"
                />
            </div>
        </div>

        {/* Athletic Profile */}
        <div className="bg-white rounded-xl overflow-hidden px-4 py-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-4 mb-2">竞技档案</h3>
            
             {/* Player Level */}
             <div className="mb-4">
                 <label className="text-xs text-gray-500 mb-2 block flex items-center gap-1"><Medal size={12}/> 球员履历级别</label>
                 <div className="flex flex-wrap gap-2">
                    {levels.map(lvl => (
                        <button
                            key={lvl}
                            onClick={() => setFormData({...formData, level: lvl})}
                            className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                                formData.level === lvl 
                                    ? (lvl === '退役职业' ? 'bg-amber-100 text-amber-700 border-amber-200 font-bold' : 'bg-[#07c160] text-white border-[#07c160]') 
                                    : 'bg-white text-gray-600 border-gray-200'
                            }`}
                        >
                            {lvl}
                        </button>
                    ))}
                 </div>
                 {formData.level === '退役职业' && (
                     <p className="text-[10px] text-amber-600 mt-2 bg-amber-50 p-2 rounded">
                        ✨ "退役职业" 标签将在约球时显著展示，大幅提升球队约战吸引力。
                     </p>
                 )}
            </div>

            <div className="grid grid-cols-3 gap-3 pb-4">
                <div>
                     <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Ruler size={12}/> 身高(cm)</label>
                     <input 
                        type="number" 
                        placeholder="--"
                        value={formData.height}
                        onChange={(e) => setFormData({...formData, height: e.target.value})}
                        className="w-full bg-gray-50 p-2.5 rounded-lg outline-none text-center text-sm font-medium"
                    />
                </div>
                <div>
                     <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><WeightIcon size={12}/> 体重(kg)</label>
                     <input 
                        type="number" 
                         placeholder="--"
                        value={formData.weight}
                        onChange={(e) => setFormData({...formData, weight: e.target.value})}
                        className="w-full bg-gray-50 p-2.5 rounded-lg outline-none text-center text-sm font-medium"
                    />
                </div>
                <div>
                     <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Footprints size={12}/> 惯用脚</label>
                     <select 
                        value={formData.strongFoot}
                        onChange={(e) => setFormData({...formData, strongFoot: e.target.value as StrongFoot})}
                        className="w-full bg-gray-50 p-2.5 rounded-lg outline-none text-center text-sm font-medium appearance-none"
                    >
                        <option value="right">右脚</option>
                        <option value="left">左脚</option>
                        <option value="both">双脚</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Save Button */}
        <button 
            onClick={handleSave}
            className="w-full bg-[#07c160] active:bg-[#06ad56] text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-100 transition-transform active:scale-[0.99] flex items-center justify-center gap-2"
        >
            <Save size={20} /> 保存档案
        </button>

      </div>
    </div>
  );
};

export default PlayerDetail;