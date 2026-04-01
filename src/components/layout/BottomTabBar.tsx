import React, { useRef, useLayoutEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  homeOutline, home,
  chatbubbleOutline, chatbubble,
  atOutline, at,
  personCircleOutline, personCircle,
} from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import './BottomTabBar.css';

interface Tab {
  path: string;
  labelInactive: string;
  iconInactive: string;
  iconActive: string;
  badge?: number;
}

const TABS: Tab[] = [
  { path: '/home',    labelInactive: 'Home',     iconInactive: homeOutline,           iconActive: home },
  { path: '/dms',     labelInactive: 'Messages',  iconInactive: chatbubbleOutline,     iconActive: chatbubble },
  { path: '/mentions',labelInactive: 'Mentions',  iconInactive: atOutline,             iconActive: at },
  { path: '/profile', labelInactive: 'You',       iconInactive: personCircleOutline,   iconActive: personCircle },
];

export const BottomTabBar: React.FC = () => {
  const location  = useLocation();
  const history   = useHistory();
  const tabRefs   = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null);

  const activeIdx = TABS.findIndex(t => location.pathname.startsWith(t.path));

  // Animate pill to active tab position
  useLayoutEffect(() => {
    const el = tabRefs.current[activeIdx];
    if (!el) return;
    const { offsetLeft, offsetWidth } = el;
    setPillStyle({ left: offsetLeft + 8, width: offsetWidth - 16 });
  }, [activeIdx]);

  const handleTab = async (tab: Tab, idx: number) => {
    if (location.pathname.startsWith(tab.path)) return;
    await Haptics.impact({ style: ImpactStyle.Light });
    history.push(tab.path);
  };

  return (
    <nav className="flx-tab-bar">
      {pillStyle && (
        <span
          className="flx-tab-pill"
          style={{ left: pillStyle.left, width: pillStyle.width, height: 32, top: '50%', transform: 'translateY(-50%)' }}
        />
      )}
      {TABS.map((tab, idx) => {
        const isActive = idx === activeIdx;
        return (
          <button
            key={tab.path}
            ref={el => { tabRefs.current[idx] = el; }}
            className={`flx-tab-bar__btn flx-pressable${isActive ? ' flx-tab-bar__btn--active' : ''}`}
            onClick={() => handleTab(tab, idx)}
            aria-label={tab.labelInactive}
          >
            <IonIcon
              icon={isActive ? tab.iconActive : tab.iconInactive}
              className="flx-tab-bar__icon"
            />
            {tab.badge ? <span className="flx-tab-bar__badge">{tab.badge > 99 ? '99+' : tab.badge}</span> : null}
          </button>
        );
      })}
    </nav>
  );
};
