import uuid

from django.conf import settings
from django.db import models


def ruta_foto_perfil(instancia, nombre):
    extension = nombre.rsplit(".", 1)[-1].lower()
    return f"perfiles/{instancia.usuario_id}/{uuid.uuid4().hex}.{extension}"


class IdentidadGoogle(models.Model):
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    google_sub = models.CharField(max_length=255, unique=True)
    vinculada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cuentas_identidad_google"


class PerfilUsuario(models.Model):
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    foto = models.FileField(upload_to=ruta_foto_perfil, blank=True)
    consentimiento_aceptado_en = models.DateTimeField(blank=True, null=True)
    consentimiento_version = models.CharField(max_length=30, blank=True, default="")

    class Meta:
        db_table = "cuentas_perfil_usuario"
