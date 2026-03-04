import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { useApp } from '../context/AppContext';
import { Camera, Save, Smartphone, Ruler, Weight as WeightIcon, Footprints, Medal, Check, Trophy, Target, Shield } from 'lucide-react';
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
    avatar: '',
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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
        avatar: player.avatar,
      });
    }
  }, [player]);

  if (!player) return <div className="p-4 text-center text-gray-500">未找到该球员</div>;

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      updatePlayer(player.id, {
        name: formData.name,
        number: Number(formData.number),
        position: formData.position,
        height: formData.height ? Number(formData.height) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        strongFoot: formData.strongFoot,
        level: formData.level,
        phone: formData.phone,
        avatar: formData.avatar,
      });
      setSaveStatus('saved');
      setTimeout(() => {
        navigate(-1);
      }, 800);
    }, 600);
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

  // Position visualization data
  const positionCoords: Record<string, { x: string; y: string; color: string }> = {
    '前锋': { x: '50%', y: '18%', color: '#ef4444' },
    '中场': { x: '50%', y: '45%', color: '#3b82f6' },
    '后卫': { x: '50%', y: '70%', color: '#22c55e' },
    '门将': { x: '50%', y: '90%', color: '#f59e0b' },
    '自由人': { x: '50%', y: '55%', color: '#8b5cf6' },
  };

  const currentPos = positionCoords[formData.position] || positionCoords['自由人'];

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <NavBar title="队员档案" showBack={true} />

      {/* Save Success Toast */}
      {saveStatus === 'saved' && (
        <div className="fixed top-16 left-0 right-0 z-[100] max-w-md mx-auto animate-in slide-in-from-top duration-200">
          <div className="mx-4 bg-[#07c160] text-white rounded-xl p-3 shadow-lg flex items-center gap-2 text-sm">
            <Check size={16} />
            <span>档案已保存</span>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Avatar + Stats Hero Section */}
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#1b2838] to-[#2d3f54] p-6 flex flex-col items-center relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4 w-32 h-32 border border-white/30 rounded-full"></div>
              <div className="absolute bottom-4 left-4 w-20 h-20 border border-white/20 rounded-full"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="relative group cursor-pointer mb-3" onClick={handleAvatarClick}>
                <img
                  src={formData.avatar}
                  alt="Player Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white/20 group-hover:opacity-80 transition-opacity shadow-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white drop-shadow-md" size={32} />
                </div>
                <div className="absolute bottom-0 right-0 bg-[#07c160] text-white p-1.5 rounded-full border-2 border-[#1b2838]">
                  <Camera size={14} />
                </div>
              </div>
              <h2 className="text-lg font-bold text-white">{formData.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/50">#{formData.number || '--'}</span>
                <span className="text-white/20">|</span>
                <span className="text-xs text-white/50">{formData.position}</span>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 bg-white">
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target size={12} className="text-[#07c160]" />
                <span className="text-[10px] text-gray-400">进球</span>
              </div>
              <div className="text-xl font-black text-gray-900">{player.goals}</div>
            </div>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Shield size={12} className="text-blue-500" />
                <span className="text-[10px] text-gray-400">助攻</span>
              </div>
              <div className="text-xl font-black text-gray-900">{player.assists}</div>
            </div>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy size={12} className="text-amber-500" />
                <span className="text-[10px] text-gray-400">MVP</span>
              </div>
              <div className="text-xl font-black text-gray-900">{player.mvpCount}</div>
            </div>
          </div>
        </div>

        {/* Position Visualization */}
        <div className="bg-white rounded-xl p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">场上位置</h3>
          <div className="relative w-full aspect-[3/4] bg-gradient-to-b from-green-600 to-green-700 rounded-xl overflow-hidden shadow-inner">
            {/* Field markings */}
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/30 rounded-full"></div>
            {/* Center line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30"></div>
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/40 rounded-full"></div>
            {/* Top penalty area */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/5 h-[18%] border-b-2 border-l-2 border-r-2 border-white/30 rounded-b-sm"></div>
            {/* Top goal area */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/5 h-[8%] border-b-2 border-l-2 border-r-2 border-white/30 rounded-b-sm"></div>
            {/* Bottom penalty area */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/5 h-[18%] border-t-2 border-l-2 border-r-2 border-white/30 rounded-t-sm"></div>
            {/* Bottom goal area */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/5 h-[8%] border-t-2 border-l-2 border-r-2 border-white/30 rounded-t-sm"></div>
            {/* Field border */}
            <div className="absolute inset-2 border-2 border-white/30 rounded-md"></div>

            {/* Position indicator */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
              style={{ left: currentPos.x, top: currentPos.y }}
            >
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold animate-pulse"
                  style={{ backgroundColor: currentPos.color }}
                >
                  {formData.number || '--'}
                </div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap font-medium backdrop-blur-sm">
                  {formData.position}
                </div>
              </div>
            </div>

            {/* Position zone labels */}
            <div className="absolute top-[10%] left-3 text-[9px] text-white/40 font-medium">进攻区</div>
            <div className="absolute top-[45%] left-3 text-[9px] text-white/40 font-medium -translate-y-1/2">中场区</div>
            <div className="absolute bottom-[16%] left-3 text-[9px] text-white/40 font-medium">防守区</div>
          </div>

          {/* Position Quick Select */}
          <div className="flex bg-gray-100 p-1 rounded-lg mt-3">
            {positions.map(pos => (
              <button
                key={pos}
                onClick={() => setFormData({ ...formData, position: pos })}
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                  formData.position === pos
                    ? 'bg-white text-[#07c160] shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
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
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-50 p-3 rounded-lg outline-none text-gray-900 text-sm font-medium"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">球衣号码</label>
              <input
                type="number"
                value={formData.number}
                onChange={e => setFormData({ ...formData, number: e.target.value })}
                className="w-full bg-gray-50 p-3 rounded-lg outline-none text-gray-900 text-sm font-bold font-mono"
              />
            </div>
          </div>

          <div className="pb-4">
            <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
              <Smartphone size={12} /> 联系电话{' '}
              <span className="text-[10px] text-gray-300">(仅队长可见)</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
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
            <label className="text-xs text-gray-500 mb-2 block flex items-center gap-1">
              <Medal size={12} /> 球员履历级别
            </label>
            <div className="flex flex-wrap gap-2">
              {levels.map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setFormData({ ...formData, level: lvl })}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                    formData.level === lvl
                      ? lvl === '退役职业'
                        ? 'bg-amber-100 text-amber-700 border-amber-200 font-bold'
                        : 'bg-[#07c160] text-white border-[#07c160]'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            {formData.level === '退役职业' && (
              <p className="text-[10px] text-amber-600 mt-2 bg-amber-50 p-2 rounded">
                "退役职业" 标签将在约球时显著展示，大幅提升球队约战吸引力。
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 pb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                <Ruler size={12} /> 身高(cm)
              </label>
              <input
                type="number"
                placeholder="--"
                value={formData.height}
                onChange={e => setFormData({ ...formData, height: e.target.value })}
                className="w-full bg-gray-50 p-2.5 rounded-lg outline-none text-center text-sm font-medium"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                <WeightIcon size={12} /> 体重(kg)
              </label>
              <input
                type="number"
                placeholder="--"
                value={formData.weight}
                onChange={e => setFormData({ ...formData, weight: e.target.value })}
                className="w-full bg-gray-50 p-2.5 rounded-lg outline-none text-center text-sm font-medium"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                <Footprints size={12} /> 惯用脚
              </label>
              <select
                value={formData.strongFoot}
                onChange={e => setFormData({ ...formData, strongFoot: e.target.value as StrongFoot })}
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
          disabled={saveStatus !== 'idle'}
          className="w-full bg-[#07c160] active:bg-[#06ad56] text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-100 transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saveStatus === 'saving' ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              保存中...
            </>
          ) : saveStatus === 'saved' ? (
            <>
              <Check size={20} /> 已保存
            </>
          ) : (
            <>
              <Save size={20} /> 保存档案
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PlayerDetail;
