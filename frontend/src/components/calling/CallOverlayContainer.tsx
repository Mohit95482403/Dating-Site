// Connectly Global Call Overlay Container
// Mounted inside main layouts to display incoming, outgoing, or active call screens globally

import React from 'react';
import IncomingCallModal from './IncomingCallModal';
import OutgoingCallModal from './OutgoingCallModal';
import CallScreen from './CallScreen';

export const CallOverlayContainer: React.FC = () => {
  return (
    <>
      <IncomingCallModal />
      <OutgoingCallModal />
      <CallScreen />
    </>
  );
};

export default CallOverlayContainer;
