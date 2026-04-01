import React from 'react';
import { FluxerReaction } from '../../types/fluxer';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import './MessageReactions.css';

interface Props {
  reactions: FluxerReaction[];
  onToggle?: (emoji: string) => void;
}

export const MessageReactions: React.FC<Props> = ({ reactions, onToggle }) => {
  if (!reactions.length) return null;

  const handleToggle = async (emoji: string) => {
    await Haptics.impact({ style: ImpactStyle.Light });
    onToggle?.(emoji);
  };

  return (
    <div className="flx-reactions">
      {reactions.map(r => (
        <button
          key={r.emoji.id ?? r.emoji.name}
          className={`flx-reaction flx-pressable${r.me ? ' flx-reaction--active' : ''}`}
          onClick={() => handleToggle(r.emoji.name)}
        >
          <span className="flx-reaction__emoji">{r.emoji.name}</span>
          <span className="flx-reaction__count">{r.count}</span>
        </button>
      ))}
    </div>
  );
};
