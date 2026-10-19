"""ADC opcional del ESP32 original: suelo, MQ-135 y LDR en cuentas originales."""


class AnalogReader:
    def __init__(self, gpio=None, attenuation_db=None):
        self.gpio = gpio
        self.attenuation_db = attenuation_db
        self._adc = None

    def read_counts(self):
        if self.gpio is None:
            return None
        # ADC2 comparte recursos con Wi-Fi en el ESP32 original del proyecto.
        if self.gpio not in (32, 33, 34, 35, 36, 37, 38, 39):
            raise ValueError("Elegir un GPIO ADC1 disponible en esta placa")
        if self.attenuation_db not in (0, 2.5, 6, 11):
            raise ValueError("Configurar atenuacion segun el voltaje real de entrada")
        if self._adc is None:
            import machine
            attenuation = {0: machine.ADC.ATTN_0DB, 2.5: machine.ADC.ATTN_2_5DB,
                           6: machine.ADC.ATTN_6DB, 11: machine.ADC.ATTN_11DB}
            self._adc = machine.ADC(machine.Pin(self.gpio))
            self._adc.atten(attenuation[self.attenuation_db])
        value = self._adc.read_u16()
        if type(value) is not int or not 0 <= value <= 65535:
            raise ValueError("Lectura ADC invalida")
        return value
