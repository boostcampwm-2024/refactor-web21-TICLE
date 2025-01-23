import { Device } from 'mediasoup-client/lib/Device';
import { useRef } from 'react';

import type { RtpCapabilities } from 'mediasoup-client/lib/RtpParameters';

const useDevice = () => {
  const deviceRef = useRef<Device | null>(null);

  const createDevice = async (rtpCapabilities: RtpCapabilities) => {
    const device = new Device();

    await device.load({ routerRtpCapabilities: rtpCapabilities });
    deviceRef.current = device;

    return device;
  };

  return {
    deviceRef,
    createDevice,
  };
};

export default useDevice;
