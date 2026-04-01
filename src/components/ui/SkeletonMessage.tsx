import React from 'react';
import './SkeletonMessage.css';

interface Props {
  lines?: number;
  showAvatar?: boolean;
}

export const SkeletonMessage: React.FC<Props> = ({ lines = 2, showAvatar = true }) => (
  <div className="flx-skeleton-msg">
    {showAvatar && <div className="flx-skeleton flx-skeleton-msg__avatar" />}
    <div className="flx-skeleton-msg__content">
      <div className="flx-skeleton flx-skeleton-msg__header" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="flx-skeleton flx-skeleton-msg__line"
          style={{ width: `${60 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  </div>
);
