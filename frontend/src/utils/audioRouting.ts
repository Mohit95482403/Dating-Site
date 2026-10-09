// Connectly Audio Routing Utility
// Manages audio output device enumeration, sinkId binding (earpiece vs speakerphone),
// and cross-browser capability detection.

export interface AudioRoutingResult {
  success: boolean;
  reason?: 'unsupported' | 'no_speaker_device' | 'error' | 'no_element';
  deviceId?: string;
  deviceLabel?: string;
  guaranteedEarpiece?: boolean;
  error?: any;
}

/**
 * Checks whether HTMLMediaElement.prototype.setSinkId is supported in the current runtime.
 */
export function isSinkIdSupported(): boolean {
  return (
    typeof HTMLMediaElement !== 'undefined' &&
    typeof (HTMLMediaElement.prototype as any).setSinkId === 'function'
  );
}

/**
 * Retrieves list of available audio output devices if supported.
 */
export async function getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.enumerateDevices
  ) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === 'audiooutput');
  } catch (err) {
    console.warn('[AudioRouting] Failed to enumerate audio devices:', err);
    return [];
  }
}

/**
 * Routes audio element to the default output sink.
 * Note: In standard mobile web browsers, setSinkId('') selects the system default output
 * and cannot guarantee private earpiece playback due to OS-level media routing restrictions.
 */
export async function routeAudioToDefault(
  element: HTMLMediaElement | null
): Promise<AudioRoutingResult> {
  if (!element) {
    return { success: false, reason: 'no_element' };
  }

  if (!isSinkIdSupported()) {
    console.log('[AudioRouting] setSinkId not supported by runtime; using browser default routing');
    return {
      success: false,
      reason: 'unsupported',
      guaranteedEarpiece: false,
    };
  }

  try {
    const outputs = await getAudioOutputDevices();
    // Look for explicit earpiece / receiver device ONLY if distinctly exposed by platform
    const earpiece = outputs.find(
      (d) =>
        d.deviceId &&
        /earpiece|receiver|handset/i.test(d.label || '')
    );

    if (earpiece && earpiece.deviceId) {
      await (element as any).setSinkId(earpiece.deviceId);
      console.log(`[AudioRouting] Routed to explicit earpiece device: ${earpiece.label}`);
      return {
        success: true,
        deviceId: earpiece.deviceId,
        deviceLabel: earpiece.label,
        guaranteedEarpiece: true,
      };
    }

    // Standard default communications sink in W3C specification is ""
    await (element as any).setSinkId('');
    console.log('[AudioRouting] Routed to default system audio sink ("")');
    return {
      success: true,
      deviceId: '',
      deviceLabel: 'System Default Output',
      guaranteedEarpiece: false,
    };
  } catch (err: any) {
    console.warn('[AudioRouting] Error routing to default audio output:', err);
    return { success: false, reason: 'error', error: err, guaranteedEarpiece: false };
  }
}

/**
 * Routes audio element to the loudspeaker / speakerphone.
 * Fails safely if the browser does not expose a distinct speaker output device.
 */
export async function routeAudioToSpeaker(
  element: HTMLMediaElement | null
): Promise<AudioRoutingResult> {
  if (!element) {
    return { success: false, reason: 'no_element' };
  }

  if (!isSinkIdSupported()) {
    console.warn('[AudioRouting] setSinkId is not supported in this browser runtime');
    return { success: false, reason: 'unsupported' };
  }

  try {
    const outputs = await getAudioOutputDevices();
    console.log('[AudioRouting] Available audio outputs:', outputs);

    // Only switch if a distinct audio output device explicitly identified as a speaker is found
    const speaker = outputs.find(
      (d) =>
        d.deviceId &&
        /speaker|loudspeaker|speakerphone/i.test(d.label || '')
    );

    if (speaker && speaker.deviceId) {
      await (element as any).setSinkId(speaker.deviceId);
      console.log(`[AudioRouting] Successfully switched to speakerphone: ${speaker.label} (${speaker.deviceId})`);
      return { success: true, deviceId: speaker.deviceId, deviceLabel: speaker.label };
    }

    // If no distinct speaker device is identified in enumerated outputs:
    // Do NOT pick a random alternate device, as that could route to microphones or headphones.
    console.warn('[AudioRouting] No distinct speakerphone device exposed in enumerated outputs');
    return { success: false, reason: 'no_speaker_device' };
  } catch (err: any) {
    console.error('[AudioRouting] Error switching to speakerphone:', err);
    return { success: false, reason: 'error', error: err };
  }
}
