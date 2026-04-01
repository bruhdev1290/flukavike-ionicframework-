import React from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';
import './DirectMessages.css';

const DirectMessages: React.FC = () => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Direct Messages</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent className="flx-dm-content">
      <div className="flx-dm-empty">
        <span className="flx-dm-empty__icon">💬</span>
        <p className="flx-dm-empty__text">No direct messages yet</p>
        <p className="flx-dm-empty__hint">Start a conversation with a friend.</p>
      </div>
    </IonContent>
  </IonPage>
);

export default DirectMessages;
