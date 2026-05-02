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
import { CountryHistory, INDICATOR_NAMES } from '@/lib/worldbank';
import { Search, Play, Pause, RotateCcw, X, Users, Settings2 } from 'lucide-react';

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

const CustomTooltip = ({ active, payload, xLabel, yLabel }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as any;
    return (
      <div className="glass-card" style={{ padding: '0.5rem', border: `1px solid ${data.renderColor || '#fff'}`, fontSize: '0.75rem' }}>
        <p style={{ fontWeight: 'bold' }}>{data.name}</p>
        <p style={{ opacity: 0.8 }}>{data.displayRegion}</p>
        <p><span style={{ color: 'var(--accent-primary)' }}>{xLabel}:</span> {data.xVal?.toLocaleString(undefined, {maximumFractionDigits: 1})}</p>
        <p><span style={{ color: 'var(--accent-tertiary)' }}>{yLabel}:</span> {data.yVal?.toLocaleString(undefined, {maximumFractionDigits: 1})}</p>
        <p><span style={{ color: 'var(--success)' }}>Pob:</span> {(data.pop / 1000000).toFixed(1)}M</p>
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
  
  const [xAxis, setXAxis] = useState('gini');
  const [yAxis, setYAxis] = useState('gdpPpp');
  const [zAxis, setZAxis] = useState('none');
  const [colorAxis, setColorAxis] = useState('region');
  const [minPop, setMinPop] = useState(1000000);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentYear(prev => prev >= 2024 ? (setIsPlaying(false), prev) : prev + 1);
      }, 400);
    } else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying]);

  const indicatorKeys = Object.keys(INDICATOR_NAMES).filter(k => k !== 'population');

  const processedData = useMemo(() => {
    let minColor = 0, maxColor = 1;
    if (colorAxis !== 'region') {
      const values = data.flatMap(c => Object.values(c.history).map(h => h[colorAxis])).filter(v => v !== null) as number[];
      minColor = Math.min(...values);
      maxColor = Math.max(...values);
    }

    return data.map(country => {
      let displayRegion = country.name === 'Chile' ? 'Chile' : REGION_MAPPING[country.region] || 'Otro';
      if (displayRegion === 'Asia' && OCEANIA_COUNTRIES.includes(country.name)) displayRegion = 'Oceania';
      const yearData = country.history[currentYear] || {};
      
      const xVal = yearData[xAxis];
      const yVal = yearData[yAxis];
      const zVal = zAxis === 'none' ? 100 : (yearData[zAxis] || 0);
      const pop = yearData['population'] || 0;
      
      let renderColor = REGION_COLORS[displayRegion] || '#94a3b8';
      if (colorAxis !== 'region' && yearData[colorAxis] !== null) {
        const ratio = (yearData[colorAxis]! - minColor) / (maxColor - minColor);
        renderColor = `hsl(${240 - ratio * 240}, 70%, 60%)`;
      }

      return { ...country, xVal, yVal, zVal, pop, displayRegion, renderColor };
    });
  }, [data, currentYear, xAxis, yAxis, zAxis, colorAxis]);

  const filteredData = useMemo(() => {
    return processedData.filter(c => 
      c.xVal !== null && c.yVal !== null && 
      visibleRegions.has(c.displayRegion) && 
      c.pop >= minPop
    );
  }, [processedData, visibleRegions, minPop]);

  const regionalCenters = useMemo(() => {
    const centers: any[] = [];
    Object.keys(REGION_COLORS).forEach(region => {
      if (!visibleRegions.has(region)) return;
      const regionCountries = filteredData.filter(c => c.displayRegion === region);
      if (regionCountries.length > 0) {
        const avgX = regionCountries.reduce((acc, c) => acc + (c.xVal || 0), 0) / regionCountries.length;
        const avgY = regionCountries.reduce((acc, c) => acc + (c.yVal || 0), 0) / regionCountries.length;
        const avgZ = zAxis === 'none' ? 400 : (regionCountries.reduce((acc, c) => acc + (c.zVal || 0), 0) / regionCountries.length) * 2;
        
        let centerColor = colorAxis === 'region' ? (REGION_COLORS[region] || '#94a3b8') : '#fff';

        centers.push({
          id: `center-${region}`,
          name: `Centro: ${region}`,
          xVal: avgX,
          yVal: avgY,
          zVal: avgZ,
          renderColor: centerColor,
          displayRegion: region,
          isCenter: true,
          z: 800
        });
      }
    });
    return centers;
  }, [filteredData, visibleRegions, zAxis, colorAxis]);

  const trajectoryData = useMemo(() => {
    const country = data.find(c => c.id === selectedCountryId);
    if (!country) return [];
    return Object.entries(country.history)
      .map(([year, values]) => ({ 
        year: parseInt(year), 
        xVal: values[xAxis], 
        yVal: values[yAxis] 
      }))
      .filter(v => v.year <= currentYear && v.xVal !== null && v.yVal !== null)
      .sort((a, b) => a.year - b.year);
  }, [data, selectedCountryId, currentYear, xAxis, yAxis]);

  const suggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    return data.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);
  }, [data, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '0.75rem' }}>
        <div style={{ position: 'relative', width: '180px' }}>
          <Search style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} size={12} />
          <input
            type="text"
            placeholder="País..."
            value={searchQuery}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
            style={{ width: '100%', padding: '0.3rem 1.5rem 0.3rem 1.8rem', borderRadius: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'white', outline: 'none', fontSize: '0.75rem' }}
          />
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 100, padding: '0.2rem', fontSize: '0.75rem' }}>
                {suggestions.map(s => (
                  <div key={s.id} onClick={() => {setSelectedCountryId(s.id); setSearchQuery(s.name); setShowSuggestions(false);}} style={{ padding: '0.3rem 0.5rem', cursor: 'pointer', borderRadius: '0.3rem' }} className="suggestion-item">{s.name}</div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <Settings2 size={14} style={{ opacity: 0.5 }} />
          {['X', 'Y', 'Z', 'Col'].map((label, idx) => {
            const current = [xAxis, yAxis, zAxis, colorAxis][idx];
            const setter = [setXAxis, setYAxis, setZAxis, setColorAxis][idx];
            return (
              <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.6rem', opacity: 0.4 }}>{label}</span>
                <select value={current} onChange={(e) => setter(e.target.value)} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'white', fontSize: '0.7rem', padding: '0.2rem', borderRadius: '0.3rem', outline: 'none' }}>
                  {label === 'Z' && <option value="none">Iguales</option>}
                  {label === 'Col' && <option value="region">Región</option>}
                  {indicatorKeys.map(k => <option key={k} value={k}>{INDICATOR_NAMES[k]}</option>)}
                </select>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '120px' }}>
          <span style={{ fontSize: '0.6rem', opacity: 0.4, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <Users size={10} /> Min Pob: {(minPop/1000000).toFixed(1)}M
          </span>
          <input 
            type="range" min="0" max="100000000" step="1000000" value={minPop} onChange={(e) => setMinPop(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--success)', height: '2px', cursor: 'pointer' }}
          />
        </div>
      </div>

      {colorAxis === 'region' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
          {Object.keys(REGION_COLORS).map(region => (
            <button key={region} onClick={() => setVisibleRegions(prev => {const n = new Set(prev); n.has(region) ? n.delete(region) : n.add(region); return n;})} style={{ padding: '0.15rem 0.35rem', borderRadius: '999px', background: visibleRegions.has(region) ? REGION_COLORS[region] + '22' : 'transparent', border: `1px solid ${REGION_COLORS[region]}`, color: visibleRegions.has(region) ? REGION_COLORS[region] : 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.6rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: REGION_COLORS[region] }} />
              {region}
            </button>
          ))}
        </div>
      )}

      <div className="glass-card" style={{ height: '400px', width: '100%', position: 'relative', padding: '0.5rem' }}>
        <div style={{ position: 'absolute', top: '0.5rem', right: '1rem', zIndex: 10 }}>
           <h2 style={{ fontSize: '2.5rem', fontWeight: '900', opacity: 0.1, margin: 0 }}>{currentYear}</h2>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis type="number" dataKey="xVal" domain={['auto', 'auto']} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
            <YAxis type="number" dataKey="yVal" domain={['auto', 'auto']} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} stroke="rgba(255,255,255,0.1)" tickFormatter={(v) => v > 1000 ? `$${Math.round(v/1000)}k` : v.toFixed(1)} />
            <ZAxis type="number" dataKey="zVal" range={[40, 400]} />
            <Tooltip 
              content={<CustomTooltip xLabel={INDICATOR_NAMES[xAxis]} yLabel={INDICATOR_NAMES[yAxis]} />} 
              trigger="hover"
              shared={false}
              cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '5 5' }}
            />
            {trajectoryData.length > 1 && <Line data={trajectoryData} type="monotone" dataKey="yVal" stroke="#fff" strokeWidth={1} dot={false} isAnimationActive={false} opacity={0.3} />}
            <Scatter name="Países" data={filteredData} isAnimationActive={false}>
              {filteredData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.renderColor} fillOpacity={entry.id === selectedCountryId ? 1 : 0.6} stroke={entry.id === selectedCountryId ? '#fff' : 'none'} strokeWidth={entry.id === selectedCountryId ? 2 : 0} />)}
            </Scatter>
            <Scatter name="Centros" data={regionalCenters} isAnimationActive={false}>
              {regionalCenters.map((entry, index) => <Cell key={`center-${index}`} fill={entry.renderColor} fillOpacity={0.9} stroke="#fff" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.2))' }} />)}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card" style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
          {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
        </button>
        <button onClick={() => { setCurrentYear(1990); setIsPlaying(false); }} style={{ background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RotateCcw size={12} />
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', opacity: 0.5 }}>
            <span>1990</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{currentYear}</span>
            <span>2024</span>
          </div>
          <input type="range" min="1990" max="2024" value={currentYear} onChange={(e) => setCurrentYear(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-primary)', height: '2px', cursor: 'pointer' }} />
        </div>
      </div>
    </div>
  );
}
