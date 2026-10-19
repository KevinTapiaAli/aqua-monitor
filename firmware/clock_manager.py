"""RTC en UTC mediante ntptime; no se envia por HTTPS antes de sincronizar."""
import time


class ClockManager:
    def __init__(self, config):
        self.config = config
        self.config.CLOCK_SYNCED = False
        self.next_attempt = time.ticks_ms()
        self.last_sync = None

    def tick(self, connected):
        now = time.ticks_ms()
        if self.last_sync is not None and time.ticks_diff(now, self.last_sync) >= 86400000:
            self.config.CLOCK_SYNCED = False
        if not connected or time.ticks_diff(now, self.next_attempt) < 0:
            return self.config.CLOCK_SYNCED
        try:
            import machine
            import ntptime

            ntptime.host = self.config.NTP_HOST
            ntptime.timeout = 3
            # El timeout UDP no limita la resolucion DNS de ntptime.
            timestamp = ntptime.time()
            utc = time.gmtime(timestamp)
            if not 2024 <= utc[0] <= 2100:
                raise ValueError("Fecha NTP fuera de rango")
            machine.RTC().datetime((utc[0], utc[1], utc[2], utc[6], utc[3], utc[4], utc[5], 0))
            self.config.CLOCK_SYNCED = True
            self.last_sync = time.ticks_ms()
            self.next_attempt = time.ticks_add(self.last_sync, 21600000)
            print("Reloj UTC sincronizado; envio HTTPS habilitado.")
        except (OSError, ValueError, ImportError, AttributeError, OverflowError):
            self.next_attempt = time.ticks_add(time.ticks_ms(), 30000)
            print("No se pudo sincronizar NTP; reintento en 30 s.")
        return self.config.CLOCK_SYNCED
