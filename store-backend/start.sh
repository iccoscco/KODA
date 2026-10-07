#!/bin/bash

# Cargar variables de entorno desde la raíz del proyecto
set -a
source ../.env
set +a

# Ejecutar la aplicación
mvn spring-boot:run

