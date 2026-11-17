import React from 'react';
import { EffectModifierId, TransitionModuleId } from '../engine/registry';

interface IconProps {
  className?: string;
}

export const UploadMediaIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="4" width="14" height="14" rx="3" stroke="#60A5FA" strokeWidth="1.8" fill="#1E293B" />
    <path d="M6 14l3-3 2.5 2.5L14 11l3 3" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="17.5" cy="17.5" r="4.5" fill="#3B82F6" />
    <path d="M17.5 15.5v4M15.5 17.5h4" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const AspectRatioIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="#38BDF8" strokeWidth="1.8" fill="#0F172A" />
    <path d="M7 9.5V8h2.5M17 14.5V16h-2.5" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="8.5" y="9.5" width="7" height="5" rx="1" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="2 1.5" />
  </svg>
);

export const ExportMp4Icon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 4v10m0 0l-4-4m4 4l4-4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 16v2.5A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5V16" stroke="#DBEAFE" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

export const ClipLayerIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="3" fill="#0F172A" stroke="#34D399" strokeWidth="1.8" />
    <path d="M7 4v16M17 4v16" stroke="#34D399" strokeWidth="1.4" opacity="0.65" />
    <path d="M10.5 9.5l4.5 2.5-4.5 2.5v-5z" fill="#6EE7B7" />
  </svg>
);

export const ClipBadgeIcon: React.FC<{ clipNumber?: number; active?: boolean; className?: string }> = ({
  clipNumber = 1,
  active = false,
  className = 'w-5 h-5',
}) => {
  const accent = clipNumber === 1 ? '#34D399' : clipNumber === 2 ? '#38BDF8' : '#FBBF24';
  const badgeFill = active ? '#FFFFFF' : '#0B1220';
  const strokeCol = active ? '#FFFFFF' : accent;
  const textFill = active ? '#1D4ED8' : accent;

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="2.5"
        y="4"
        width="19"
        height="16"
        rx="3.2"
        fill={active ? 'rgba(255,255,255,0.16)' : '#0E1523'}
        stroke={strokeCol}
        strokeWidth="1.7"
      />
      <path d="M6.2 4.5v15M17.8 4.5v15" stroke={strokeCol} strokeWidth="1.2" opacity="0.55" />
      <rect x="8.2" y="6.8" width="7.6" height="10.4" rx="2" fill={badgeFill} stroke={strokeCol} strokeWidth="1" />
      <text
        x="12"
        y="14.5"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="800"
        fontFamily="ui-monospace, monospace"
        fill={textFill}
      >
        {clipNumber}
      </text>
    </svg>
  );
};

export const SwapClipsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M7 8h11l-3-3M17 16H6l3 3" stroke="#FBBF24" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TextLayerIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="3" fill="#1F1226" stroke="#F472B6" strokeWidth="1.7" />
    <path d="M7.5 8.5h9M12 8.5v7.5" stroke="#FDF2F8" strokeWidth="2.1" strokeLinecap="round" />
    <circle cx="17.5" cy="15.5" r="2" fill="#EC4899" />
  </svg>
);

export const TransitionTabIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M4 17C8.5 17 8.5 7 12 7s3.5 10 8 10" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 4.5L14.5 7 12 9.5 9.5 7 12 4.5z" fill="#60A5FA" stroke="#FFFFFF" strokeWidth="1.1" />
    <circle cx="5" cy="17" r="2" fill="#93C5FD" />
    <circle cx="19" cy="17" r="2" fill="#93C5FD" />
  </svg>
);

export const EffectsTabIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z" fill="#FB7185" fillOpacity="0.28" stroke="#FB7185" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M4 12l8 4.5 8-4.5" stroke="#FBBF24" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 16.5l8 4.5 8-4.5" stroke="#60A5FA" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SequenceFlowIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="2.5" y="6.5" width="6.5" height="11" rx="1.8" fill="#0F172A" stroke="#34D399" strokeWidth="1.6" />
    <rect x="15" y="6.5" width="6.5" height="11" rx="1.8" fill="#0F172A" stroke="#EC4899" strokeWidth="1.6" />
    <path d="M9 12h6" stroke="#38BDF8" strokeWidth="1.9" strokeLinecap="round" />
    <path d="M12 9.5L14.5 12 12 14.5 9.5 12 12 9.5z" fill="#FBBF24" />
  </svg>
);

export const BalancedWaveIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M3 15c3-7 6-7 9 0s6 7 9 0" stroke="#38BDF8" strokeWidth="2.1" strokeLinecap="round" />
    <circle cx="12" cy="12" r="2.2" fill="#E0F2FE" />
  </svg>
);

export const FastEditBoltIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M13.5 3L6 13.5h5.5L10.5 21l7.5-10.5h-5.5L13.5 3z" fill="#FDE047" stroke="#F59E0B" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

export const HardEditFlameIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M12.6 3.5c.5 2.7-1.4 4.2-2.5 5.6-1 1.3-1.8 2.4-1.6 4 .3 2.2 2.1 3.7 4 3.7 2.1 0 3.7-1.6 3.7-3.9 0-1.9-1.1-3.6-2.2-4.8 1 .7 3.3 2.7 3.3 5.8 0 3.3-2.5 5.8-5.7 5.8-3.2 0-5.7-2.4-5.7-5.6 0-2.8 1.6-4.7 3.1-6.3 1.3-1.4 2.8-2.6 3.6-4.3z"
      fill="#FB7185"
      stroke="#F43F5E"
      strokeWidth="1.1"
    />
    <circle cx="12.3" cy="15.2" r="1.7" fill="#FFF1F2" />
  </svg>
);

export const ResetParamIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M4.5 11.5A7.5 7.5 0 1112 19.5a7.3 7.3 0 01-5.2-2.1" stroke="#93C5FD" strokeWidth="1.9" strokeLinecap="round" />
    <path d="M4.5 7v4.8h4.8" stroke="#60A5FA" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ScissorsTrimIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="6.5" cy="7.5" r="2.5" stroke="#FBBF24" strokeWidth="1.8" />
    <circle cx="6.5" cy="16.5" r="2.5" stroke="#FBBF24" strokeWidth="1.8" />
    <path d="M8.5 9l10.5 6.5M8.5 15L19 8.5" stroke="#FDE68A" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M19 4v16" stroke="#38BDF8" strokeWidth="1.4" strokeDasharray="2 2" />
  </svg>
);

export const SafetyLockIcon: React.FC<{ locked: boolean; className?: string }> = ({
  locked,
  className = 'w-4 h-4',
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect
      x="5"
      y="10"
      width="14"
      height="10"
      rx="2.5"
      fill={locked ? '#78350F' : '#1E293B'}
      stroke={locked ? '#FBBF24' : '#94A3B8'}
      strokeWidth="1.8"
    />
    {locked ? (
      <path d="M8 10V7.5a4 4 0 018 0V10" stroke="#FDE68A" strokeWidth="1.9" strokeLinecap="round" />
    ) : (
      <path d="M8 10V7.5a4 4 0 017.4-2" stroke="#CBD5E1" strokeWidth="1.9" strokeLinecap="round" />
    )}
    <circle cx="12" cy="15" r="1.4" fill={locked ? '#FBBF24' : '#94A3B8'} />
  </svg>
);

export const ReplaceMediaIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="5" width="13" height="11" rx="2.2" fill="#0F172A" stroke="#60A5FA" strokeWidth="1.6" />
    <path d="M6 13l2.8-2.8 2.2 2.2 2-2 2 2.6" stroke="#93C5FD" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 11v6m0 0l-2.2-2.2M19 17l2.2-2.2" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const FontUploadVectorIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M5 18L10 6l5 12M7 14h6" stroke="#E2E8F0" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.5 16V8m0 0l-2.5 2.5M18.5 8l2.5 2.5" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ColorPaletteVectorIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="#181B21" stroke="#A78BFA" strokeWidth="1.6" />
    <circle cx="9.5" cy="9" r="1.6" fill="#F43F5E" />
    <circle cx="14.5" cy="9" r="1.6" fill="#38BDF8" />
    <circle cx="8.5" cy="13.5" r="1.6" fill="#FBBF24" />
    <circle cx="14.5" cy="14" r="1.8" fill="#34D399" />
  </svg>
);

export const MoveUpVectorIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M6.5 14.5L12 9l5.5 5.5" stroke="#E2E8F0" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MoveDownVectorIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M6.5 9.5L12 15l5.5-5.5" stroke="#E2E8F0" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EditSlidersVectorIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" stroke="#94A3B8" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="9" cy="7" r="2.2" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.1" />
    <circle cx="15" cy="12" r="2.2" fill="#F472B6" stroke="#FFFFFF" strokeWidth="1.1" />
    <circle cx="10" cy="17" r="2.2" fill="#FBBF24" stroke="#FFFFFF" strokeWidth="1.1" />
  </svg>
);

export const DeleteTrashVectorIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M5 7h14M9.5 4.5h5M8 7l.8 11.5a1.5 1.5 0 001.5 1.5h3.4a1.5 1.5 0 001.5-1.5L16 7" stroke="#FCA5A5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 10.5v5M13.5 10.5v5" stroke="#F87171" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const PlusAddVectorIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="#1D4ED8" fillOpacity="0.25" stroke="#60A5FA" strokeWidth="1.7" />
    <path d="M12 8v8M8 12h8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const PlayVectorIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M7.5 5.5l11 6.5-11 6.5v-13z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

export const PauseVectorIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="7" y="5.5" width="3.5" height="13" rx="1.2" fill="#FFFFFF" />
    <rect x="13.5" y="5.5" width="3.5" height="13" rx="1.2" fill="#FFFFFF" />
  </svg>
);

export const StepBackFrameIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="6" y="6" width="2.2" height="12" rx="1" fill="#38BDF8" />
    <path d="M17.5 6.5L10.2 12l7.3 5.5v-11z" fill="#E2E8F0" />
  </svg>
);

export const StepFwdFrameIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="15.8" y="6" width="2.2" height="12" rx="1" fill="#38BDF8" />
    <path d="M6.5 6.5L13.8 12l-7.3 5.5v-11z" fill="#E2E8F0" />
  </svg>
);

export const BeatMarkerIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 3.5l4.8 8.5L12 20.5 7.2 12 12 3.5z" fill="#FBBF24" fillOpacity="0.25" stroke="#FBBF24" strokeWidth="1.8" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2" fill="#FEF08A" />
  </svg>
);

export const CosmicFireIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" fill="#230912" stroke="#D81B45" strokeWidth="1.4" />
    <path
      d="M12.6 4.5c.4 2.4-1.2 3.8-2.2 5-.9 1.1-1.6 2.1-1.4 3.5.3 1.9 1.9 3.2 3.5 3.2 1.8 0 3.2-1.4 3.2-3.4 0-1.6-.9-3.1-1.9-4.2.9.6 2.9 2.3 2.9 5 0 2.9-2.2 5-4.9 5-2.8 0-5-2.1-5-4.9 0-2.4 1.4-4.1 2.7-5.5 1.1-1.2 2.4-2.2 3.1-3.7z"
      fill="#FF4A6A"
    />
    <path
      d="M12 12c-1 1-1.4 2.1-1.1 3.1.2.8.9 1.3 1.6 1.3.9 0 1.5-.7 1.5-1.6 0-.9-.7-1.9-2-2.8z"
      fill="#FF9AAE"
    />
  </svg>
);

export const TransitionModuleIcon: React.FC<{ id: TransitionModuleId; className?: string }> = ({
  id,
  className = 'w-8 h-8',
}) => {
  switch (id) {
    case 'cosmic_slide_3d':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="28" height="28" rx="7" fill="#1C0914" stroke="#E11D48" strokeWidth="1.6" />
          <path d="M8 10l12-2.5v17L8 22V10z" fill="#311022" stroke="#F43F5E" strokeWidth="1.5" />
          <circle cx="23.5" cy="9" r="2.2" fill="#BAE6FD" />
          <path d="M19 9h9M23.5 5v8" stroke="#7DD3FC" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case 'master-3d-neon-whip':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="28" height="28" rx="7" fill="#1A0E24" stroke="#EC4899" strokeWidth="1.6" />
          <rect x="8" y="8" width="14" height="16" rx="3" transform="rotate(-10 15 16)" fill="#2D1538" stroke="#F472B6" strokeWidth="1.6" />
          <path d="M20 12h7M22 16h6" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'fake-zoom-geo-slide':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="28" height="28" rx="7" fill="#121826" stroke="#F59E0B" strokeWidth="1.6" />
          <path d="M16 7l7 5-3 9H12l-3-9 7-5z" fill="#451A03" stroke="#FBBF24" strokeWidth="1.5" />
          <circle cx="16" cy="15" r="3" stroke="#FDE68A" strokeWidth="1.5" />
        </svg>
      );
    case 'smooth-zoom-out-tilt':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="28" height="28" rx="7" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.6" />
          <rect x="9" y="9" width="14" height="14" rx="2.5" transform="rotate(8 16 16)" fill="#1E293B" stroke="#7DD3FC" strokeWidth="1.6" />
          <path d="M11 11L7 7M21 21l4 4" stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'focus_pulse_shake':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="28" height="28" rx="7" fill="#141625" stroke="#818CF8" strokeWidth="1.6" />
          <circle cx="16" cy="16" r="6" stroke="#A5B4FC" strokeWidth="1.8" />
          <circle cx="16" cy="16" r="2.2" fill="#FFFFFF" />
          <path d="M6 12l2 4-2 4M26 12l-2 4 2 4" stroke="#818CF8" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'cinematic-shake-impact':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="28" height="28" rx="7" fill="#211114" stroke="#F97316" strokeWidth="1.6" />
          <path d="M17 6l-6 10h6l-2 10 7-11h-6l1-9z" fill="#FDBA74" stroke="#F97316" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="28" height="28" rx="7" fill="#161920" stroke="#64748B" strokeWidth="1.6" />
          <path d="M10 16h12" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
};

export const EffectModifierIcon: React.FC<{ id: EffectModifierId; className?: string }> = ({
  id,
  className = 'w-7 h-7',
}) => {
  switch (id) {
    case 'cosmic_fire_glow':
    case 'cosmic-fire':
      return <CosmicFireIcon className={className} />;
    case 'picture-glow-shadow-feather':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#181224" stroke="#A78BFA" strokeWidth="1.4" />
          <rect x="6" y="6" width="12" height="12" rx="2" fill="#2E1065" stroke="#DDD6FE" strokeWidth="1.5" />
        </svg>
      );
    case 'starfield-lens-flare':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#0B1324" stroke="#38BDF8" strokeWidth="1.4" />
          <path d="M12 5v14M5 12h14" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.6" fill="#FFFFFF" />
        </svg>
      );
    case 'focus-pulse-shake':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#14182D" stroke="#818CF8" strokeWidth="1.4" />
          <circle cx="12" cy="12" r="4.8" stroke="#A5B4FC" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="1.8" fill="#FFFFFF" />
          <path d="M5 9.5l1.5 2.5L5 14.5M19 9.5L17.5 12l1.5 2.5" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'handheld-shake':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#1F1512" stroke="#FB923C" strokeWidth="1.4" />
          <rect x="7" y="7.5" width="10" height="9" rx="2" transform="rotate(-8 12 12)" fill="#431407" stroke="#FDBA74" strokeWidth="1.5" />
          <path d="M4.8 7.5c-.8 1.5-.8 3.2 0 4.6M19.2 11.9c.8 1.5.8 3.2 0 4.6" stroke="#FB923C" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'neon-glow-aura':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#240D1E" stroke="#F472B6" strokeWidth="1.4" />
          <circle cx="12" cy="12" r="5.5" stroke="#EC4899" strokeWidth="2.4" opacity="0.6" />
          <circle cx="12" cy="12" r="3" stroke="#FFFFFF" strokeWidth="1.4" />
        </svg>
      );
    case 'rotational-zoom-blur':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#101827" stroke="#60A5FA" strokeWidth="1.4" />
          <path d="M12 6a6 6 0 11-5.2 3" stroke="#93C5FD" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2" fill="#3B82F6" />
        </svg>
      );
    case 'chromatic-aberration':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#14141C" stroke="#38BDF8" strokeWidth="1.4" />
          <circle cx="10.2" cy="12" r="4" stroke="#F43F5E" strokeWidth="1.6" />
          <circle cx="13.8" cy="12" r="4" stroke="#22D3EE" strokeWidth="1.6" />
        </svg>
      );
    case 'beat-bloom':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#23190B" stroke="#FBBF24" strokeWidth="1.4" />
          <circle cx="12" cy="12" r="4" fill="#FDE68A" />
          <path d="M12 5v2M12 17v2M5 12h2M17 12h2" stroke="#FBBF24" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'geometric-dissolve':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#161424" stroke="#C084FC" strokeWidth="1.4" />
          <path d="M12 6l5 4-2 6H9l-2-6 5-4z" stroke="#E9D5FF" strokeWidth="1.6" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#151822" stroke="#94A3B8" strokeWidth="1.4" />
          <path d="M7 13l3-4 4 6 3-3" stroke="#E2E8F0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
};

export const ParamControlIcon: React.FC<{ paramKey: string; className?: string }> = ({
  paramKey,
  className = 'w-4 h-4',
}) => {
  switch (paramKey) {
    case 'durationScale':
    case 'durationSec':
    case 'assemblyDurationSec':
    case 'fadeInDurationSec':
    case 'fadeOutDurationSec':
    case 'introSec':
    case 'outroSec':
    case 'imageDuration':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <circle cx="10" cy="10.5" r="6.5" stroke="#38BDF8" strokeWidth="1.6" />
          <path d="M10 7v3.8l2.6 1.5M8 2.5h4" stroke="#BAE6FD" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'cardTiltDeg':
    case 'tiltSwingDeg':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <rect x="5" y="4" width="10" height="12" rx="1.8" transform="rotate(-14 10 10)" stroke="#F472B6" strokeWidth="1.6" fill="#2D1538" />
          <path d="M4 16.5A8 8 0 0016 16.5" stroke="#60A5FA" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="2 1.5" />
        </svg>
      );
    case 'cardScale':
    case 'startScale':
    case 'endScale':
    case 'zoomPush':
    case 'zoomPunchAmount':
    case 'fontScale':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <rect x="3.5" y="3.5" width="13" height="13" rx="2" stroke="#60A5FA" strokeWidth="1.5" />
          <path d="M7 7l6 6M13 7h-3m3 0v3M7 13h3m-3 0v-3" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'whipBlurPx':
    case 'slideAmount':
    case 'slideDirection':
    case 'motionBlurStrength':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <path d="M3 7h11M5 10h12M3 13h9" stroke="#38BDF8" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M14 7.5L17 10l-3 2.5" stroke="#BAE6FD" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'radialBlurPx':
    case 'strength':
    case 'focusPulseEnabled':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <circle cx="10" cy="10" r="6.5" stroke="#818CF8" strokeWidth="1.4" strokeDasharray="2.5 2" />
          <circle cx="10" cy="10" r="3" fill="#A5B4FC" />
        </svg>
      );
    case 'beatBrightness':
    case 'brightness':
    case 'flashPeak':
    case 'glowIntensity':
    case 'power':
    case 'intensity':
    case 'lensFlareEnabled':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <circle cx="10" cy="10" r="3.5" fill="#FDE047" />
          <path d="M10 2.5v2.2M10 15.3v2.2M2.5 10h2.2M15.3 10h2.2M4.8 4.8l1.6 1.6M13.6 13.6l1.6 1.6M15.2 4.8l-1.6 1.6M6.4 13.6l-1.6 1.6" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'chromaticSplit':
    case 'spread':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <circle cx="8.2" cy="10" r="3.6" stroke="#FB7185" strokeWidth="1.6" />
          <circle cx="11.8" cy="10" r="3.6" stroke="#22D3EE" strokeWidth="1.6" />
        </svg>
      );
    case 'shakeStrength':
    case 'shakeAmp':
    case 'shakeFreq':
    case 'shakeEnabled':
    case 'amount':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <path d="M2.5 10l2.2-3.5L7 13.5l2.5-7L12 13.5l2.5-7 2 3.5h1" stroke="#FB923C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'starDensity':
    case 'starSpeed':
    case 'ghostFramesEnabled':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6L10 3z" fill="#BAE6FD" stroke="#38BDF8" strokeWidth="1.2" />
        </svg>
      );
    case 'geoStrength':
    case 'letterScatterAmount':
    case 'scanlineGlitchEnabled':
    case 'holesEnabled':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <path d="M10 3.5l5.5 4-2 6H6.5l-2-6 5.5-4z" stroke="#C084FC" strokeWidth="1.6" fill="#2E1065" />
        </svg>
      );
    case 'shadowStrength':
    case 'edgeFeatherAmount':
    case 'featherPercent':
    case 'edgeSoftness':
    case 'rimThickness':
    case 'opacity':
    case 'smokeEnabled':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <rect x="4" y="4" width="9" height="9" rx="2" fill="#475569" stroke="#CBD5E1" strokeWidth="1.4" />
          <rect x="7" y="7" width="9" height="9" rx="2" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.4" strokeDasharray="2 1.5" />
        </svg>
      );
    case 'upwardBias':
    case 'turbulence':
    case 'riseSpeed':
    case 'speed':
    case 'breathing':
    case 'seed':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <path d="M6 14c0-3.5 3-4.5 3-8M11 15c0-3 3-4 3-7.5" stroke="#FB7185" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M7.5 6.5L9 4.5l1.5 2" stroke="#FDA4AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'trimStart':
    case 'trimEnd':
      return <ScissorsTrimIcon className={className} />;
    default:
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <path d="M3.5 6.5h13M3.5 13.5h13" stroke="#64748B" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="7.5" cy="6.5" r="2" fill="#38BDF8" />
          <circle cx="12.5" cy="13.5" r="2" fill="#F472B6" />
        </svg>
      );
  }
};
