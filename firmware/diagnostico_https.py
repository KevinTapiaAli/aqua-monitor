"""Ejecutar tras reiniciar: solo TLS, sin POST ni token enviado al servidor.

No importa aqua_real ni activa sensores, pantalla o RGB. Usa la CA existente.
No desactiva la verificacion del certificado. Termina despues de un intento.
"""
import gc
import time
import sys
import os
import socket
import ssl
import config
from wifi_manager import WifiManager
from clock_manager import ClockManager


def main():
    print("=== DIAGNOSTICO HTTPS: SIN ENVIO DE DATOS ===")
    print("Firmware:", sys.version)
    print("Placa:", os.uname().machine)
    print("Destino:", config.API_HOST, config.API_PORT)
    wifi = WifiManager(config)
    clock = ClockManager(config)
    start = time.ticks_ms()
    ready = False
    while time.ticks_diff(time.ticks_ms(), start) < 90000:
        try:
            connected = wifi.tick()
        except OSError:
            connected = False
        if clock.tick(connected):
            ready = True
            break
        time.sleep_ms(250)
    if not ready:
        print("No se obtuvo Wi-Fi y hora NTP en este intento.")
        return
    print("UTC:", time.gmtime()[:6])
    raw = None
    stream = None
    stage = "cargar CA"
    try:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        context.verify_mode = ssl.CERT_REQUIRED
        with open(config.CA_CERT_PATH, "rb") as file:
            cert = file.read()
        print("CA bytes:", len(cert))
        import hashlib
        import ubinascii
        print("CA SHA256:", ubinascii.hexlify(hashlib.sha256(cert).digest()).decode())
        context.load_verify_locations(cadata=cert)
        del cert
        stage = "DNS"
        address = socket.getaddrinfo(config.API_HOST, config.API_PORT,
                                     socket.AF_INET, socket.SOCK_STREAM)[0][-1]
        gc.collect()
        print("RAM Python libre:", gc.mem_free())
        try:
            import esp32
            print("RAM nativa:", esp32.idf_heap_info(esp32.HEAP_DATA))
        except (ImportError, AttributeError):
            pass
        stage = "TCP"
        raw = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        raw.settimeout(10)
        raw.connect(address)
        stage = "TLS"
        stream = context.wrap_socket(raw, server_hostname=config.API_HOST)
        print("TLS OK: certificado aceptado. No se envio HTTP ni token.")
    except (OSError, ValueError, MemoryError, AttributeError) as error:
        print("Fallo en", stage, "|", type(error).__name__, "|", str(error))
    finally:
        for connection in (stream, raw):
            if connection is not None:
                try:
                    connection.close()
                except OSError:
                    pass
    print("=== FIN ===")


if __name__ == "__main__":
    main()
