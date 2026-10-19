"""HTTPS acotado, sin redirecciones ni desactivación de validación TLS.

Usa SSLContext/CERT_REQUIRED y server_hostname de MicroPython ESP32 1.28.
La primera conexión física sigue pendiente de comprobar en la placa.
"""
import json
import socket
import time


class ConfigurationError(Exception):
    pass


class ApiClient:
    def __init__(self, config):
        self.config = config
        self.context = None
        self.deadline = 0
        self.raw_socket = None
        self.stage = "inicio"
        self.response_status = None
        self.failure_reason = None

    def error_summary(self, exc):
        """Etiquetas y diagnostico TLS nativo; nunca cuerpos HTTP ni credenciales."""
        code = next((item for item in exc.args if type(item) is int), None)
        if self.failure_reason:
            reason = self.failure_reason
        elif isinstance(exc, MemoryError):
            reason = "memoria insuficiente"
        else:
            message = str(exc).upper()
            if code == -9984 or any(marker in message for marker in (
                "CERTIFICATE_VERIFY_FAILED", "CERTIFICATE VERIFY FAILED",
                "CERTIFICATE VERIFICATION FAILED", "CERTIFICATE HAS EXPIRED",
            )):
                reason = "certificado rechazado: revisar CA, fecha UTC y hostname"
            elif "TIMED OUT" in message or "TIMEOUT" in message or code == 110:
                reason = "tiempo de espera agotado"
            elif "ALLOC" in message or "MEMORY" in message:
                reason = "memoria insuficiente durante transporte"
            elif "CONNECTION RESET" in message or code == 104:
                reason = "conexion interrumpida por el extremo remoto"
            elif "ECONNABORTED" in message or code == 103:
                reason = "conexion abortada"
            else:
                reason = "causa sin clasificar"
        return (self.stage, type(exc).__name__, code, reason, self.response_status)

    def _context(self):
        if not self.config.CLOCK_SYNCED:
            raise ConfigurationError("Esperar sincronizacion del reloj antes de transmitir")
        if not self.config.DEVICE_TOKEN.startswith("aq_"):
            raise ConfigurationError("Falta la credencial del dispositivo")
        if self.config.API_IP:
            parts = self.config.API_IP.split(".")
            if len(parts) != 4 or any(not part.isdigit() or not 0 <= int(part) <= 255 for part in parts):
                raise ConfigurationError("API_IP debe ser una dirección IPv4 literal")
        for value in (self.config.API_HOST, self.config.API_PATH, self.config.DEVICE_TOKEN):
            if "\r" in value or "\n" in value or " " in value:
                raise ConfigurationError("Configuración HTTP inválida")
        if "/" in self.config.API_HOST or not self.config.API_PATH.startswith("/"):
            raise ConfigurationError("Hostname o ruta inválidos")
        if self.context is None:
            try:
                import ssl
                context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
                context.verify_mode = ssl.CERT_REQUIRED
                with open(self.config.CA_CERT_PATH, "rb") as certificate:
                    context.load_verify_locations(cadata=certificate.read())
                if context.verify_mode != ssl.CERT_REQUIRED:
                    raise ConfigurationError("No se pudo exigir la validación TLS")
                self.context = context
            except (AttributeError, ImportError, TypeError, OSError, ValueError) as exc:
                raise ConfigurationError("TLS o certificado CA no disponibles") from exc
        return self.context

    def _check_deadline(self):
        remaining = time.ticks_diff(self.deadline, time.ticks_ms())
        if remaining <= 0:
            self.failure_reason = "plazo total de solicitud agotado"
            raise OSError("Tiempo máximo de solicitud alcanzado")
        if self.raw_socket is not None:
            self.raw_socket.settimeout(min(self.config.SOCKET_TIMEOUT_SECONDS, remaining / 1000))

    def _read(self, stream, count):
        data = bytearray()
        while len(data) < count:
            self._check_deadline()
            part = stream.read(count - len(data))
            if not part:
                self.failure_reason = "conexion cerrada antes de completar respuesta"
                raise OSError("Respuesta incompleta")
            data.extend(part)
        return bytes(data)

    def _line(self, stream, limit=1024):
        line = bytearray()
        while len(line) < limit:
            line.extend(self._read(stream, 1))
            if line[-1] == 10:
                return bytes(line)
        self.failure_reason = "linea HTTP supera el limite permitido"
        raise OSError("Cabecera demasiado larga")

    def post(self, body):
        self.stage = "configuracion TLS"
        self.response_status = None
        self.failure_reason = None
        context = self._context()
        self.deadline = time.ticks_add(time.ticks_ms(), self.config.REQUEST_DEADLINE_SECONDS * 1000)
        # DNS depende de lwIP: el plazo de solicitud no limita getaddrinfo.
        # API_IP es opcional; no evita la verificación del hostname TLS.
        address = self.config.API_IP
        self.stage = "DNS"
        if not address:
            address = socket.getaddrinfo(self.config.API_HOST, self.config.API_PORT, socket.AF_INET, socket.SOCK_STREAM)[0][-1][0]
        self._check_deadline()
        raw_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.raw_socket = raw_socket
        stream = None
        try:
            self.stage = "conexion TCP"
            self._check_deadline()
            raw_socket.connect((address, self.config.API_PORT))
            self.stage = "negociacion TLS"
            self._check_deadline()
            try:
                stream = context.wrap_socket(raw_socket, server_hostname=self.config.API_HOST)
            except ValueError as exc:
                # MicroPython 1.28 entrega motivos X.509 como ValueError de texto.
                # En este punto no se ha construido ni enviado Authorization.
                # Solo conservar el mensaje nativo TLS, nunca una respuesta HTTP.
                detail = " ".join(str(exc).split())
                detail = detail.replace(self.config.DEVICE_TOKEN, "[credencial omitida]")
                self.failure_reason = "TLS: " + detail[:240]
                print("Fecha UTC de la placa:", time.gmtime()[:6])
                raise
            self.stage = "envio HTTPS"
            self._check_deadline()
            host = self.config.API_HOST if self.config.API_PORT == 443 else "%s:%d" % (self.config.API_HOST, self.config.API_PORT)
            headers = ("POST %s HTTP/1.1\r\nHost: %s\r\nAuthorization: Bearer %s\r\n"
                       "Content-Type: application/json\r\nAccept: application/json\r\n"
                       "Content-Length: %d\r\nConnection: close\r\n\r\n") % (self.config.API_PATH, host, self.config.DEVICE_TOKEN, len(body))
            for part in (headers.encode(), body):
                offset = 0
                while offset < len(part):
                    self._check_deadline()
                    sent = stream.write(part[offset:])
                    if not sent:
                        raise OSError("No se pudo enviar la solicitud")
                    offset += sent
            self.stage = "lectura del estado HTTP"
            status_line = self._line(stream)
            status_parts = status_line.split(b" ", 2)
            if len(status_parts) < 2 or not status_parts[0].startswith(b"HTTP/"):
                raise OSError("Respuesta HTTP inválida")
            status = int(status_parts[1])
            self.response_status = status
            self.stage = "lectura de cabeceras HTTP"
            response_headers = {}
            header_bytes = 0
            while True:
                line = self._line(stream)
                header_bytes += len(line)
                if header_bytes > 8192:
                    self.failure_reason = "cabeceras HTTP superan 8192 bytes"
                    raise OSError("Respuesta demasiado grande")
                if line == b"\r\n":
                    break
                key, value = line.split(b":", 1)
                response_headers[key.strip().lower()] = value.strip().lower()
            self.stage = "lectura del cuerpo HTTP"
            if response_headers.get(b"transfer-encoding") == b"chunked":
                payload = bytearray()
                while True:
                    size = int(self._line(stream, 128).split(b";", 1)[0].strip(), 16)
                    if size == 0:
                        break
                    if size < 0 or len(payload) + size > 8192:
                        self.failure_reason = "cuerpo HTTP supera el limite permitido"
                        raise OSError("Respuesta demasiado grande")
                    payload.extend(self._read(stream, size))
                    if self._read(stream, 2) != b"\r\n":
                        raise OSError("Fragmento HTTP inválido")
                payload = bytes(payload)
            elif b"content-length" in response_headers:
                size = int(response_headers[b"content-length"])
                if not 0 <= size <= 8192:
                    self.failure_reason = "cuerpo HTTP supera el limite permitido"
                    raise OSError("Respuesta demasiado grande")
                payload = self._read(stream, size)
            else:
                payload = bytearray()
                while True:
                    self._check_deadline()
                    chunk = stream.read(256)
                    if not chunk:
                        break
                    payload.extend(chunk)
                    if len(payload) > 8192:
                        self.failure_reason = "cuerpo HTTP supera el limite permitido"
                        raise OSError("Respuesta demasiado grande")
                payload = bytes(payload)
            self.stage = "decodificacion JSON"
            try:
                result = json.loads(payload)
            except ValueError:
                result = None
            retry_after = response_headers.get(b"retry-after", b"0")
            try:
                retry_after = min(120, max(0, int(retry_after)))
            except ValueError:
                retry_after = 0
            return status, result, retry_after
        finally:
            self.raw_socket = None
            try:
                if stream is not None:
                    stream.close()
                else:
                    raw_socket.close()
            except OSError:
                # No ocultar el error original ni perder una respuesta recibida.
                pass
