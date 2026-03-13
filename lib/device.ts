/**
 * Gets the unique device ID for the current browser.
 * If no device ID exists in localStorage, generates a new one and stores it.
 */
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
};
