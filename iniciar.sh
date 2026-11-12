#!/usr/bin/env sh
# Inicia el portafolio sin Docker. Requiere Java 21+, Maven y MySQL/MariaDB en el puerto 3306.
cd "$(dirname "$0")"
echo "Portafolio de Samuel Suira · http://localhost:9000"
( sleep 3; (xdg-open http://localhost:9000 || open http://localhost:9000) >/dev/null 2>&1 ) &
exec java portal/Portal.java
