'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Line,
  ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { CountryHistory } from '@/lib/worldbank';
import { Search, Play, Pause, RotateCcw, X, Check } from 'lucide-react';

interface DevelopmentChartProps {
  data: CountryHistory[];
}

const REGION_MAPPING: Record<string, string> = {
  'Latin America & Caribbean': 'Latinoamerica',
  'North America': 'Norteamerica',
  'Europe & Central Asia': 'Europa',
  'Sub-Saharan Africa': 'Africa',
  'Middle East & North Africa': 'Africa',
  'South Asia': 'Asia',
  'East Asia & Pacific': 'Asia',
};

const OCEANIA_COUNTRIES = ['Australia', 'New Zealand', 'Fiji', 'Papua New Guinea', 'Solomon Islands', 'Vanuatu', 'Samoa', 'Tonga'];

const REGION_COLORS: Record<string, string> = {
  'Chile': '#ffffff',
  'Latinoamerica': '#22c55e',
  'Norteamerica': '#f97316',
  'Europa': '#3b82f6',
  'Africa': '#991b1b',
  'Asia': '#eab308',
  'Oceania': '#d946ef',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as any;
    return (
      <div className="glass-card" style={{ padding: '0.5rem', border: `1px solid ${data.color || '#fff'}`, fontSize: '0.75rem' }}>
        <p style={{ fontWeight: 'bold' }}>{data.name}</p>
        <p style={{ opacity: 0.8 }}>{data.displayRegion}</p>
        <p><span style={{ color: 'var(--accent-primary)' }}>Gini:</span> {data.gini?.toFixed(1)}</p>
        <p><span style={{ color: 'var(--accent-tertiary)' }}>PIB:</span> ${data.gdpPpp?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function DevelopmentChart({ data }: DevelopmentChartProps) {
  const [currentYear, setCurrentYear] = useState(1990);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountryId, setSelectedCountryId] = useState<string>('CHL');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [visibleRegions, setVisibleRegions] = useState<Set<string>>(new Set(Object.keys(REGION_COLORS)));
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentYear(prev => prev >= 2024 ? (setIsPlaying(false), prev) : prev + 1);
      }, 400);
    } else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying]);

  const processedData = useMemo(() => {
    return data.map(country => {
      let displayRegion = country.name === 'Chile' ? 'Chile' : REGION_MAPPING[country.region] || 'Otro';
      if (displayRegion === 'Asia' && OCEANIA_COUNTRIES.includes(country.name)) displayRegion = 'Oceania';
      const yearData = country.history[currentYear] || { gini: null, gdpPpp: null };
      return { ...country, ...yearData, displayRegion, color: REGION_COLORS[displayRegion] || '#94a3b8' };
    });
  }, [data, currentYear]);

  const filteredData = useMemo(() => {
    return processedData.filter(c => c.gini !== null && c.gdpPpp !== null && visibleRegions.has(c.displayRegion));
  }, [processedData, visibleRegions]);

  const trajectoryData = useMemo(() => {
    const country = data.find(c => c.id === selectedCountryId);
    if (!country) return [];
    return Object.entries(country.history)
      .map(([year, values]) => ({ year: parseInt(year), ...values }))
      .filter(v => v.year <= currentYear && v.gini !== null && v.gdpPpp !== null)
      .sort((a, b) => a.year - b.year);
  }, [data, selectedCountryId, currentYear]);

  const suggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    return data.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);
  }, [data, searchQuery]);

  const handleSelectCountry = (country: CountryHistory) => {
    setSelectedCountryId(country.id);
    setSearchQuery(country.name);
    setShowSuggestions(false);
  };

  const selectedCountry = data.find(c => c.id === selectedCountryId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Search & Legend Compact */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '250px' }}>
          <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} size={14} />
          <input
            type="text"
            placeholder="Buscar país..."
            value={searchQuery}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
            style={{ width: '100%', padding: '0.4rem 2rem 0.4rem 2rem', borderRadius: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'white', outline: 'none', fontSize: '0.875rem' }}
          />
          {searchQuery && <X size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5 }} onClick={() => {setSearchQuery(''); setSelectedCountryId('');}} />}
          
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '0.5rem', padding: '0.25rem', maxHeight: '200px', overflowY: 'auto' }}>
                {suggestions.map(s => (
                  <div key={s.id} onClick={() => handleSelectCountry(s)} style={{ padding: '0.4rem 0.75rem', cursor: 'pointer', borderRadius: '0.5rem', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="suggestion-item">
                    {s.name} {selectedCountryId === s.id && <Check size={12} color="var(--success)" />}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {Object.keys(REGION_COLORS).map(region => (
            <button key={region} onClick={() => setVisibleRegions(prev => {const n = new Set(prev); n.has(region) ? n.delete(region) : n.add(region); return n;})} style={{ padding: '0.25rem 0.5rem', borderRadius: '999px', background: visibleRegions.has(region) ? REGION_COLORS[region] + '22' : 'transparent', border: `1px solid ${REGION_COLORS[region]}`, color: visibleRegions.has(region) ? REGION_COLORS[region] : 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: REGION_COLORS[region] }} />
              {region}
            </button>
          ))}
        </div>

        {selectedCountry && (
          <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: '600', background: 'rgba(56, 189, 248, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Seleccionado: {selectedCountry.name}
          </div>
        )}
      </div>

      {/* Chart Container Compact */}
      <div className="glass-card" style={{ height: '400px', width: '100%', position: 'relative', padding: '0.75rem' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1.5rem', zIndex: 10 }}>
           <h2 style={{ fontSize: '3rem', fontWeight: '900', opacity: 0.1, margin: 0 }}>{currentYear}</h2>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis type="number" dataKey="gini" domain={[20, 65]} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
            <YAxis type="number" dataKey="gdpPpp" domain={[0, 140000]} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} stroke="rgba(255,255,255,0.1)" tickFormatter={(v) => `$${Math.round(v/1000)}k`} />
            <ZAxis type="number" range={[60, 300]} />
            <Tooltip content={<CustomTooltip />} />
            
            {trajectoryData.length > 1 && (
              <Line data={trajectoryData} type="monotone" dataKey="gdpPpp" stroke={selectedCountry?.name === 'Chile' ? '#fff' : (REGION_COLORS[REGION_MAPPING[selectedCountry?.region || '']] || '#fff')} strokeWidth={2} dot={false} isAnimationActive={false} />
            )}

            <Scatter name="Países" data={filteredData} isAnimationActive={false}>
              {filteredData.map((entry, index) => {
                const isSelected = entry.id === selectedCountryId;
                return <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={isSelected ? 1 : 0.4} stroke={isSelected ? '#fff' : 'none'} strokeWidth={isSelected ? 2 : 0} />;
              })}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Playback Controls Compact */}
      <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
        </button>
        <button onClick={() => { setCurrentYear(1990); setIsPlaying(false); }} style={{ background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RotateCcw size={14} />
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', opacity: 0.5 }}>
            <span>1990</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{currentYear}</span>
            <span>2024</span>
          </div>
          <input type="range" min="1990" max="2024" value={currentYear} onChange={(e) => setCurrentYear(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-primary)', height: '3px', cursor: 'pointer' }} />
        </div>
      </div>
    </div>
  );
}
