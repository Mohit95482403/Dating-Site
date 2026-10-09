// Connectly Audio Routing Utility
// Manages audio output device enumeration, sinkId binding (earpiece vs speakerphone),
// and cross-browser capability detection.

export interface AudioRoutingResult {
  success: boolean;
  reason?: 'unsupported' | 'no_speaker_device' | 'error' | 'no_element';
  deviceId?: string;
  deviceLabel?: string;
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
 * Routes audio element to the default private-call output (earpiece / default communications sink).
 * Always safe to call - will not throw or break audio playback.
 */
export async function routeAudioToDefault(
  element: HTMLMediaElement | null
): Promise<AudioRoutingResult> {
  if (!element) {
    return { success: false, reason: 'no_element' };
  }

  if (!isSinkIdSupported()) {
    console.log('[AudioRouting] setSinkId not supported by runtime; using platform default routing');
    return { success: false, reason: 'unsupported' };
  }

  try {
    const outputs = await getAudioOutputDevices();
    // Look for explicit earpiece / receiver / handset device if exposed by platform
    const earpiece = outputs.find(
      (d) =>
        d.deviceId &&
        /earpiece|receiver|phone|handset|internal/i.test(d.label || '')
    );

    if (earpiece && earpiece.deviceId) {
      await (element as any).setSinkId(earpiece.deviceId);
      console.log(`[AudioRouting] Routed to earpiece device: ${earpiece.label} (${earpiece.deviceId})`);
      return { success: true, deviceId: earpiece.deviceId, deviceLabel: earpiece.label };
    }

    // Standard default communications sink in W3C specification is ""
    await (element as any).setSinkId('');
    console.log('[AudioRouting] Routed to default private-call audio sink ("")');
    return { success: true, deviceId: '', deviceLabel: 'Default' };
  } catch (err: any) {
    console.warn('[AudioRouting] Error routing to default private audio output:', err);
    return { success: false, reason: 'error', error: err };
  }
}

/**
 * Routes audio element to the loudspeaker / speakerphone.
 * Only succeeds if the platform exposes a distinct speaker output or supports sink switching.
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

    // 1. Check for device with label explicitly matching speaker / loudspeaker
    const speaker = outputs.find(
      (d) =>
        d.deviceId &&
        /speaker|loudspeaker|speakerphone|outer/i.test(d.label || '')
    );

    if (speaker && speaker.deviceId) {
      await (element as any).setSinkId(speaker.deviceId);
      console.log(`[AudioRouting] Successfully switched to speakerphone: ${speaker.label} (${speaker.deviceId})`);
      return { success: true, deviceId: speaker.deviceId, deviceLabel: speaker.label };
    }

    // 2. If multiple output devices exist and one is not default, try alternate output
    const alternate = outputs.find(
      (d) =>
        d.deviceId &&
        d.deviceId !== '' &&
        d.deviceId !== 'default' &&
        !/earpiece|receiver|phone|handset/i.test(d.label || '')
    );

    if (alternate && alternate.deviceId) {
      await (element as any).setSinkId(alternate.deviceId);
      console.log(`[AudioRouting] Switched to alternate output device: ${alternate.label} (${alternate.deviceId})`);
      return { success: true, deviceId: alternate.deviceId, deviceLabel: alternate.label };
    }

    // 3. If there is only 1 device ("default") and no distinct speaker output is exposed:
    // Some mobile browsers return only a single "default" device despite setSinkId existing.
    // In that case, we cannot physically switch hardware routes via WebRTC API.
    console.warn('[AudioRouting] No distinct speakerphone device found in enumerated audio outputs');
    return { success: false, reason: 'no_speaker_device' };
  } catch (err: any) {
    console.error('[AudioRouting] Error switching to speakerphone:', err);
    return { success: false, reason: 'error', error: err };
  }
}
