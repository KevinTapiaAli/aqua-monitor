import time
from api_client import ApiClient, ConfigurationError
from payload import make_payload


class Telemetry:
    """Cola acotada, reintentos exponenciales y pausa ante credenciales inválidas."""

    def __init__(self, config):
        if not 1 <= config.QUEUE_CAPACITY <= 100:
            raise ValueError("QUEUE_CAPACITY debe estar entre 1 y 100")
        self.config = config
        self.client = ApiClient(config)
        self.queue = []
        self.next_attempt = time.ticks_ms()
        self.backoff = 2
        self.paused = False
        self.dropped = 0
        self.rejected = 0
        self.last_http_status = None

    def enqueue(self, readings):
        item = make_payload(readings, self.config.CLOCK_SYNCED)
        if len(self.queue) >= self.config.QUEUE_CAPACITY:
            # Mantiene observaciones recientes. Se cuenta explícitamente la pérdida.
            self.queue.pop(0)
            self.dropped += 1
            if self.dropped == 1 or self.dropped % 10 == 0:
                print("Cola llena; lecturas descartadas:", self.dropped)
        self.queue.append(item)

    def _retry(self, seconds=0):
        delay = min(self.config.MAX_RETRY_SECONDS, max(self.backoff, seconds))
        self.next_attempt = time.ticks_add(time.ticks_ms(), delay * 1000)
        self.backoff = min(self.config.MAX_RETRY_SECONDS, self.backoff * 2)

    def tick(self, connected):
        if self.paused or not connected or not self.queue or time.ticks_diff(time.ticks_ms(), self.next_attempt) < 0:
            return
        reading_id, body = self.queue[0]
        try:
            status, result, retry_after = self.client.post(body)
            self.last_http_status = status
            if status in (200, 201):
                data = result.get("data") if isinstance(result, dict) else None
                if not isinstance(data, dict) or data.get("reading_id") != reading_id or not data.get("id"):
                    print("Respuesta sin confirmacion de lectura; se reintentara.")
                    self._retry()
                    return
                self.queue.pop(0)
                self.backoff = 2
                # Recupera el backlog a 1 lectura / 2 segundos, evitando el límite DB.
                self.next_attempt = time.ticks_add(time.ticks_ms(), 2000)
                print("Lectura guardada en Aqua Monitor. HTTP", status)
            elif status in (401, 403, 404) or 300 <= status < 400:
                self.paused = True
                print("Telemetría pausada: revisar credencial, dispositivo o URL. HTTP", status)
            elif status in (400, 409, 413, 415, 422):
                # Error permanente de este registro: no bloquea las lecturas siguientes.
                self.queue.pop(0)
                self.rejected += 1
                self.next_attempt = time.ticks_add(time.ticks_ms(), 2000)
                print("Lectura rechazada; revisar contrato/calibración. HTTP", status)
            else:
                print("Envio pendiente; se reintentara. HTTP", status)
                self._retry(retry_after)
        except ConfigurationError as exc:
            self.paused = True
            # Solo mensajes propios y constantes de ApiClient, nunca del proveedor.
            print("Telemetria pausada:", str(exc))
        except (AttributeError, TypeError, IndexError):
            self.paused = True
            print("Telemetría pausada: transporte incompatible con este firmware.")
        except (OSError, ValueError, MemoryError) as exc:
            stage, kind, code, reason, http_status = self.client.error_summary(exc)
            print("Envio fallido | etapa:", stage, "| tipo:", kind,
                  "| codigo:", code, "| motivo:", reason, "| HTTP:", http_status)
            self._retry()

    def resume(self):
        """Llamar después de corregir configuración; reconstruye el contexto TLS."""
        self.client = ApiClient(self.config)
        self.paused = False
        self.backoff = 2
        self.next_attempt = time.ticks_ms()
