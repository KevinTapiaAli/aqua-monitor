"""HTTPS acotado, sin redirecciones ni desactivación de validación TLS.

Requiere un port con SSLContext/CERT_REQUIRED comprobados. No es un driver
universal para cualquier versión de MicroPython. Ver README antes de activarlo.
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

    def _context(self):
        if not self.config.TLS_CAPABILITIES_VERIFIED or not self.config.CLOCK_SYNCED:
            raise ConfigurationError("Verificar TLS y ajustar RTC antes de transmitir")
        if not self.config.DEVICE_TOKEN.startswith("aq_"):
            raise ConfigurationError("Falta la credencial del dispositivo")
        if not self.config.API_IP and not self.config.DNS_TIMEOUT_VERIFIED:
            raise ConfigurationError("Falta verificar timeout de DNS o configurar API_IP")
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
            raise OSError("Tiempo máximo de solicitud alcanzado")
        if self.raw_socket is not None:
            self.raw_socket.settimeout(min(self.config.SOCKET_TIMEOUT_SECONDS, remaining / 1000))

    def _read(self, stream, count):
        data = bytearray()
        while len(data) < count:
            self._check_deadline()
            part = stream.read(count - len(data))
            if not part:
                raise OSError("Respuesta incompleta")
            data.extend(part)
        return bytes(data)

    def _line(self, stream, limit=1024):
        line = bytearray()
        while len(line) < limit:
            line.extend(self._read(stream, 1))
            if line[-1] == 10:
                return bytes(line)
        raise OSError("Cabecera demasiado larga")

    def post(self, body):
        context = self._context()
        self.deadline = time.ticks_add(time.ticks_ms(), self.config.REQUEST_DEADLINE_SECONDS * 1000)
        # getaddrinfo puede depender del timeout interno lwIP. API_IP evita DNS
        # en este camino; no evita ni reemplaza verificación del hostname TLS.
        address = self.config.API_IP
        if not address:
            address = socket.getaddrinfo(self.config.API_HOST, self.config.API_PORT, socket.AF_INET, socket.SOCK_STREAM)[0][-1][0]
        self._check_deadline()
        raw_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.raw_socket = raw_socket
        stream = None
        try:
            self._check_deadline()
            raw_socket.connect((address, self.config.API_PORT))
            self._check_deadline()
            stream = context.wrap_socket(raw_socket, server_hostname=self.config.API_HOST)
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
            status_line = self._line(stream)
            status_parts = status_line.split(b" ", 2)
            if len(status_parts) < 2 or not status_parts[0].startswith(b"HTTP/"):
                raise OSError("Respuesta HTTP inválida")
            status = int(status_parts[1])
            response_headers = {}
            header_bytes = 0
            while True:
                line = self._line(stream)
                header_bytes += len(line)
                if header_bytes > 8192:
                    raise OSError("Respuesta demasiado grande")
                if line == b"\r\n":
                    break
                key, value = line.split(b":", 1)
                response_headers[key.strip().lower()] = value.strip().lower()
            if response_headers.get(b"transfer-encoding") == b"chunked":
                payload = bytearray()
                while True:
                    size = int(self._line(stream, 128).split(b";", 1)[0].strip(), 16)
                    if size == 0:
                        break
                    if size < 0 or len(payload) + size > 8192:
                        raise OSError("Respuesta demasiado grande")
                    payload.extend(self._read(stream, size))
                    if self._read(stream, 2) != b"\r\n":
                        raise OSError("Fragmento HTTP inválido")
                payload = bytes(payload)
            elif b"content-length" in response_headers:
                size = int(response_headers[b"content-length"])
                if not 0 <= size <= 8192:
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
                        raise OSError("Respuesta demasiado grande")
                payload = bytes(payload)
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
            if stream is not None:
                stream.close()
            else:
                raw_socket.close()
