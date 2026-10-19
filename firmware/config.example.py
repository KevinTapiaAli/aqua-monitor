"""Copiar como config.py SOLO en el equipo/ESP32. Nunca publicar secretos."""

WIFI_SSID = ""
WIFI_PASSWORD = ""
API_HOST = "aqua-monitor-gamma.vercel.app"  # Sin https:// ni ruta.
API_PORT = 443
API_PATH = "/api/v1/ingest"
DEVICE_TOKEN = ""  # Generado desde Dispositivos; nunca una clave Supabase.
CA_CERT_PATH = "certs/root-ca.der"

# GPIO tomado del código real IoT_medidor_temp.py; no modificar sin revisar cableado.
TEMPERATURE_GPIO = 4
# La lectura original se conserva en raw.temperature_c mientras sea False.
# Activar solo después de confirmar y documentar la calibración de la sonda.
TEMPERATURE_CALIBRATION_CONFIRMED = False

# Opcionales: None mantiene el sensor desactivado, sin lecturas ficticias.
# Humedad del suelo: salida AO de modulo tipo YL-69, sin convertir a porcentaje.
SOIL_GPIO = None
SOIL_ATTENUATION_DB = None
# Elegir GPIO ADC1 y atenuacion (0, 2.5, 6 u 11) tras revisar el circuito.
# La atenuacion NO protege una entrada contra sobretension. No aplicar 5 V.
MQ135_GPIO = None
MQ135_ATTENUATION_DB = None
MQ135_STABILIZATION_CONFIRMED = False
LDR_GPIO = None
LDR_ATTENUATION_DB = None

# ClockManager ajusta este estado despues de sincronizar RTC; no editarlo.
CLOCK_SYNCED = False
NTP_HOST = "pool.ntp.org"

SEND_INTERVAL_SECONDS = 10
SOCKET_TIMEOUT_SECONDS = 5
REQUEST_DEADLINE_SECONDS = 20
QUEUE_CAPACITY = 30  # Cola en RAM: se pierde al reiniciar, no desgasta la flash.
MAX_RETRY_SECONDS = 120
WIFI_CONNECT_TIMEOUT_SECONDS = 12
WIFI_RETRY_SECONDS = 15

# Opcional: dirección IPv4 obtenida de una resolución controlada por el integrador.
# Mantener el hostname real para SNI y verificación del certificado.
# Si es None se usa getaddrinfo; su timeout depende de MicroPython/lwIP.
# DNS puede retrasar la adquisicion; no se promete muestreo de tiempo real estricto.
API_IP = None
