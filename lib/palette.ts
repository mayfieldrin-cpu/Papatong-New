import type { PaletteId, PaletteColor } from '@/types'

export const PALETTE: PaletteColor[] = [
  { id: 'rose',   dot: '#D4537E', bg: '#4B1528', text: '#F4C0D1', dim: '#2a0c17' },
  { id: 'amber',  dot: '#EF9F27', bg: '#412402', text: '#FAC775', dim: '#261501' },
  { id: 'lime',   dot: '#639922', bg: '#173404', text: '#C0DD97', dim: '#0d1f02' },
  { id: 'teal',   dot: '#1D9E75', bg: '#04342C', text: '#9FE1CB', dim: '#021e19' },
  { id: 'sky',    dot: '#378ADD', bg: '#042C53', text: '#B5D4F4', dim: '#021830' },
  { id: 'indigo', dot: '#7F77DD', bg: '#26215C', text: '#CECBF6', dim: '#161336' },
  { id: 'coral',  dot: '#D85A30', bg: '#4A1B0C', text: '#F0997B', dim: '#2a0f07' },
  { id: 'gray',   dot: '#888780', bg: '#2C2C2A', text: '#D3D1C7', dim: '#1a1a18' },
]

export function palColor(id: PaletteId | string): PaletteColor {
  return PALETTE.find(p => p.id === id) ?? PALETTE[4]
}

export const CONF_LEVELS = [
  { v: 1 as const, label: 'Beginner',   color: '#E24B4A', bg: 'rgba(226,75,74,0.15)'  },
  { v: 2 as const, label: 'Developing', color: '#EF9F27', bg: 'rgba(239,159,39,0.15)' },
  { v: 3 as const, label: 'Confident',  color: '#378ADD', bg: 'rgba(55,138,221,0.15)' },
  { v: 4 as const, label: 'Mastered',   color: '#1D9E75', bg: 'rgba(29,158,117,0.15)' },
]

export function confInfo(v: number) {
  return CONF_LEVELS.find(c => c.v === v) ?? CONF_LEVELS[0]
}

export const DEFAULT_CATS = [
  { id: 'tech', name: 'Technical Skills',       color: 'sky'  as PaletteId },
  { id: 'voc',  name: 'Creative Vocabularies',  color: 'rose' as PaletteId },
]

export const DEFAULT_DOMAINS = [
  { id: 'animation', name: 'Animation',    color: 'sky'    as PaletteId },
  { id: 'drawing',   name: 'Drawing',      color: 'teal'   as PaletteId },
  { id: 'design',    name: 'Design',       color: 'indigo' as PaletteId },
  { id: 'sound',     name: 'Sound Design', color: 'coral'  as PaletteId },
]
