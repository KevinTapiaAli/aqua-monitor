"""Copiar como config.py SOLO en el equipo/ESP32. Nunca publicar secretos."""

WIFI_SSID = ""
WIFI_PASSWORD = ""
API_HOST = "tu-proyecto.vercel.app"  # Solo hostname; sin esquema ni ruta.
API_PORT = 443
API_PATH = "/api/v1/ingest"
DEVICE_TOKEN = ""  # Generado desde Dispositivos; nunca una clave Supabase.
CA_CERT_PATH = "certs/root-ca.der"

# GPIO tomado del código real IoT_medidor_temp.py; no modificar sin revisar cableado.
TEMPERATURE_GPIO = 4
# La lectura original se conserva en raw.temperature_c mientras sea False.
# Activar solo después de confirmar y documentar la calibración de la sonda.
TEMPERATURE_CALIBRATION_CONFIRMED = False

# No activar hasta verificar CERT_REQUIRED, hostname, CA y reloj en la placa real.
TLS_CAPABILITIES_VERIFIED = False
# True únicamente tras ajustar/verificar RTC en UTC. Se reinicia en cada arranque.
CLOCK_SYNCED = False

SEND_INTERVAL_SECONDS = 10
SOCKET_TIMEOUT_SECONDS = 5
REQUEST_DEADLINE_SECONDS = 8
QUEUE_CAPACITY = 30  # Cola en RAM: se pierde al reiniciar, no desgasta la flash.
MAX_RETRY_SECONDS = 120
WIFI_CONNECT_TIMEOUT_SECONDS = 12
WIFI_RETRY_SECONDS = 15

# Opcional: dirección IPv4 obtenida de una resolución controlada por el integrador.
# Mantener el hostname real para SNI y verificación del certificado.
# Si es None se usa getaddrinfo; su timeout depende del puerto MicroPython/lwIP.
API_IP = None
# Marcar True solo si se comprobó un límite de DNS en el firmware real.
# Sin IP explícita ni verificación, la telemetría permanece pausada.
DNS_TIMEOUT_VERIFIED = False
