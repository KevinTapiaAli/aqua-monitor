import network
import time


class WifiManager:
    """Reconexión por pasos; no espera en un bucle bloqueante por la red."""

    def __init__(self, config):
        self.config = config
        self.wlan = network.WLAN(network.STA_IF)
        self.wlan.active(True)
        self.started = None
        self.next_attempt = time.ticks_ms()

    def connected(self):
        return self.wlan.isconnected()

    def tick(self):
        now = time.ticks_ms()
        if self.connected():
            self.started = None
            return True
        if self.started is not None:
            if self.wlan.status() < 0 or time.ticks_diff(now, self.started) >= self.config.WIFI_CONNECT_TIMEOUT_SECONDS * 1000:
                self.wlan.disconnect()
                self.started = None
                self.next_attempt = time.ticks_add(now, self.config.WIFI_RETRY_SECONDS * 1000)
            return False
        if time.ticks_diff(now, self.next_attempt) >= 0:
            try:
                self.wlan.connect(self.config.WIFI_SSID, self.config.WIFI_PASSWORD)
                self.started = now
            except OSError:
                self.next_attempt = time.ticks_add(now, self.config.WIFI_RETRY_SECONDS * 1000)
        return False
