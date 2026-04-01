import React from 'react';
import { UserStatus } from '../../types/fluxer';
import './StatusDot.css';

interface Props {
  status: UserStatus;
  size?: number;
}

export const StatusDot: React.FC<Props> = ({ status, size = 10 }) => (
  <span
    className={`flx-status-dot flx-status-dot--${status}`}
    style={{ width: size, height: size }}
    aria-label={status}
  />
);
