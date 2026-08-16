import React from 'react';
import { StreamState } from '../types.js';
import { Radio, AlertCircle, RefreshCw, Square, Play, Pause } from 'lucide-react';

interface StatusBadgeProps {
  status: StreamState;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'LIVE':
        return {
          label: 'LIVE 24/7',
          bgColor: 'bg-emerald-950/80',
          textColor: 'text-emerald-400',
          borderColor: 'border-emerald-500/40',
          dotColor: 'bg-emerald-400',
          pulse: true,
          icon: Radio,
        };
      case 'STARTING':
        return {
          label: 'STARTING',
          bgColor: 'bg-amber-950/80',
          textColor: 'text-amber-400',
          borderColor: 'border-amber-500/40',
          dotColor: 'bg-amber-400',
          pulse: true,
          icon: Play,
        };
      case 'STOPPING':
        return {
          label: 'STOPPING',
          bgColor: 'bg-orange-950/80',
          textColor: 'text-orange-400',
          borderColor: 'border-orange-500/40',
          dotColor: 'bg-orange-400',
          pulse: true,
          icon: Pause,
        };
      case 'RECONNECTING':
        return {
          label: 'RECONNECTING',
          bgColor: 'bg-indigo-950/80',
          textColor: 'text-indigo-400',
          borderColor: 'border-indigo-500/40',
          dotColor: 'bg-indigo-400',
          pulse: true,
          icon: RefreshCw,
        };
      case 'ERROR':
        return {
          label: 'STREAM ERROR',
          bgColor: 'bg-rose-950/80',
          textColor: 'text-rose-400',
          borderColor: 'border-rose-500/40',
          dotColor: 'bg-rose-400',
          pulse: false,
          icon: AlertCircle,
        };
      case 'STOPPED':
      case 'IDLE':
      default:
        return {
          label: 'STANDBY',
          bgColor: 'bg-zinc-900/80',
          textColor: 'text-zinc-400',
          borderColor: 'border-zinc-700/50',
          dotColor: 'bg-zinc-500',
          pulse: false,
          icon: Square,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs font-semibold',
    md: 'px-2.5 py-1 text-xs font-bold tracking-wide',
    lg: 'px-3.5 py-1.5 text-sm font-extrabold tracking-wider',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeStyles} ${className}`}
    >
      {config.pulse ? (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotColor}`}
          />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`} />
        </span>
      ) : (
        <span className={`inline-flex rounded-full h-2 w-2 ${config.dotColor}`} />
      )}
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{config.label}</span>
    </span>
  );
};
