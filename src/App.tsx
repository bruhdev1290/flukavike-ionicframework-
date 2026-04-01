import React from 'react';
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

/* Ionic core CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Flukavike design system — loaded before all components */
import './theme/variables.css';
import './theme/global.css';

/* Auth */
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

/* Pages */
import Login from './pages/Login';
import Home from './pages/Home';
import DirectMessages from './pages/DirectMessages';

setupIonicReact({
  mode: 'ios', // Use iOS design language everywhere for consistent feel on Android
});

const App: React.FC = () => (
  <AuthProvider>
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          {/* Public routes */}
          <Route exact path="/login" component={Login} />

          {/* Protected routes */}
          <ProtectedRoute exact path="/home"    component={Home} />
          <ProtectedRoute exact path="/dms"     component={DirectMessages} />
          <ProtectedRoute exact path="/mentions" component={Home} />
          <ProtectedRoute exact path="/profile"  component={Home} />

          {/* Default redirect */}
          <Route exact path="/" render={() => <Redirect to="/home" />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  </AuthProvider>
);

export default App;
