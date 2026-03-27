'use client'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import type { PortfolioHealthScore } from '@/types'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const SECTOR_COLORS = ['#3B8BEB', '#00D4AA', '#FFB800', '#FF4560', '#8B95A8', '#6366f1', '#f59e0b', '#ec4899']

interface Props {
  healthScore: PortfolioHealthScore
}

export default function HealthScore({ healthScore }: Props) {
  const { score, grade, issues, suggestions, sector_allocation } = healthScore
  const color = score >= 75 ? '#00D4AA' : score >= 55 ? '#FFB800' : '#FF4560'

  const sectorData = Object.entries(sector_allocation)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-4">
      {/* Score circle */}
      <div className="bg-bg-secondary rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1E2A3D" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke={color} strokeWidth="3"
                strokeDasharray={`${score * 0.974} 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono font-bold text-lg leading-none" style={{ color }}>{score}</span>
              <span className="text-[8px] text-text-secondary">/ 100</span>
            </div>
          </div>
          <div>
            <div className="font-bold text-base text-text-primary">{grade}</div>
            <div className="text-xs text-text-secondary">Portfolio Health</div>
            <div className="text-[10px] mt-1 font-medium" style={{ color }}>
              {score >= 75 ? 'Well diversified portfolio' : score >= 55 ? 'Moderate risk level' : 'High concentration risk'}
            </div>
          </div>
        </div>
      </div>

      {/* Sector donut */}
      {sectorData.length > 0 && (
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="text-xs font-bold text-text-secondary uppercase mb-3">Sector Allocation</div>
          <div className="flex items-center gap-4">
            <div style={{ width: 100, height: 100 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sectorData} cx="50%" cy="50%" innerRadius={28} outerRadius={48} dataKey="value" strokeWidth={0}>
                    {sectorData.map((_, i) => <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0D1421', border: '1px solid #1E2A3D', borderRadius: 6, fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {sectorData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                    <span className="text-[10px] text-text-secondary">{d.name}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold" style={{ color: d.value > 40 ? '#FF4560' : '#8B95A8' }}>
                    {d.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <div className="bg-bg-secondary rounded-lg p-3 space-y-1.5">
          <div className="text-xs font-bold text-accent-red uppercase mb-2">Issues Found</div>
          {issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertTriangle size={10} className="text-accent-gold mt-0.5 shrink-0" />
              <span className="text-[11px] text-text-secondary">{issue}</span>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-bg-secondary rounded-lg p-3 space-y-1.5">
          <div className="text-xs font-bold text-accent-green uppercase mb-2">Suggestions</div>
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <CheckCircle2 size={10} className="text-accent-green mt-0.5 shrink-0" />
              <span className="text-[11px] text-text-secondary">{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
