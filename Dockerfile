# Imagen con Java 21 + Maven: compila los laboratorios, descarga Tomcat y arranca el portal.
FROM maven:3.9-eclipse-temurin-21

WORKDIR /app
COPY labs ./labs

# Compila cada laboratorio (las dependencias quedan en la imagen)
RUN for p in laboratorio1/prog5-base laboratorio2/lab2-patrones laboratorio2/lab2-cuenta-bancaria \
             laboratorio2/lab2-taller-poo laboratorio4/mvc-estudiantes laboratorio5/gestion-inventario-jsp \
             laboratorio7/prototipo-java21 laboratorio8/ReservasLabAPI; do \
      (cd labs/$p && mvn -q -B -DskipTests package) || exit 1; \
    done

# Tomcat 10.1 para el laboratorio 5
ARG TOMCAT_VERSION=10.1.34
ADD https://archive.apache.org/dist/tomcat/tomcat-10/v${TOMCAT_VERSION}/bin/apache-tomcat-${TOMCAT_VERSION}.tar.gz /tmp/tomcat.tar.gz
RUN tar -xzf /tmp/tomcat.tar.gz -C /opt && mv /opt/apache-tomcat-${TOMCAT_VERSION} /opt/tomcat && rm /tmp/tomcat.tar.gz

COPY portal ./portal
COPY web ./web
COPY db ./db

ENV PORTAL_HOST=0.0.0.0 \
    TOMCAT_HOME=/opt/tomcat
EXPOSE 9000 8080 8081 8082 3000
CMD ["java", "portal/Portal.java"]
