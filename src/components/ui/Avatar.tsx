import React from 'react';
import { FluxerUser, UserStatus } from '../../types/fluxer';
import { StatusDot } from './StatusDot';
import './Avatar.css';

interface Props {
  user: Pick<FluxerUser, 'id' | 'username' | 'avatar'>;
  status?: UserStatus;
  size?: 'sm' | 'md' | 'lg';
  cdnBase?: string;
}

const SIZE_MAP = { sm: 24, md: 40, lg: 80 };

function getAvatarUrl(userId: string, avatar: string | null | undefined, cdnBase: string, px: number): string {
  if (avatar) return `${cdnBase}/avatars/${userId}/${avatar}.webp?size=${px}`;
  // Default avatar — use modulo like Discord
  const index = Number(BigInt(userId) % BigInt(5));
  return `${cdnBase}/embed/avatars/${index}.png`;
}

export const Avatar: React.FC<Props> = ({
  user,
  status,
  size = 'md',
  cdnBase = 'https://cdn.fluxer.app',
}) => {
  const px = SIZE_MAP[size];
  const src = getAvatarUrl(user.id, user.avatar, cdnBase, px * 2);

  return (
    <div className={`flx-avatar flx-avatar--${size}`} style={{ width: px, height: px }}>
      <img
        src={src}
        alt={user.username}
        className="flx-avatar__img flx-guild-icon"
        loading="lazy"
        decoding="async"
      />
      {status && (
        <StatusDot
          status={status}
          size={size === 'sm' ? 8 : size === 'lg' ? 16 : 12}
        />
      )}
    </div>
  );
};
