-- Bases de datos de los laboratorios 4 y 5.
-- Se puede ejecutar varias veces: solo crea lo que falta y no duplica los datos de ejemplo.

-- ---------------------------------------------------------------
-- Lab 4 · MVC Estudiantes (Spring Boot + JPA)
-- ---------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS mvc_unachi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'mvc_user'@'localhost' IDENTIFIED BY 'MVC2026*';
CREATE USER IF NOT EXISTS 'mvc_user'@'127.0.0.1' IDENTIFIED BY 'MVC2026*';
CREATE USER IF NOT EXISTS 'mvc_user'@'%' IDENTIFIED BY 'MVC2026*';
GRANT ALL PRIVILEGES ON mvc_unachi.* TO 'mvc_user'@'localhost';
GRANT ALL PRIVILEGES ON mvc_unachi.* TO 'mvc_user'@'127.0.0.1';
GRANT ALL PRIVILEGES ON mvc_unachi.* TO 'mvc_user'@'%';
FLUSH PRIVILEGES;

USE mvc_unachi;

CREATE TABLE IF NOT EXISTS estudiantes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cedula VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL,
    apellido VARCHAR(80) NOT NULL,
    correo VARCHAR(120) NOT NULL,
    carrera VARCHAR(120) NOT NULL
);

INSERT IGNORE INTO estudiantes (cedula, nombre, apellido, correo, carrera) VALUES
('4-123-456', 'Ana', 'González', 'ana.gonzalez@ejemplo.com', 'Ingeniería de Software'),
('4-234-567', 'Carlos', 'Rodríguez', 'carlos.rodriguez@ejemplo.com', 'Ingeniería de Sistemas');

-- ---------------------------------------------------------------
-- Lab 5 · Gestión de Inventario (JSP + Servlets + JDBC)
-- ---------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS inventario_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE inventario_db;

CREATE TABLE IF NOT EXISTS articulo (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    codigo_barra  VARCHAR(50)  NOT NULL UNIQUE,
    nombre        VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS existencia (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    articulo_id           INT NOT NULL,
    cantidad_existencia   INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_existencia_articulo FOREIGN KEY (articulo_id) REFERENCES articulo(id) ON DELETE CASCADE,
    CONSTRAINT uq_existencia_articulo UNIQUE (articulo_id)
);

INSERT IGNORE INTO articulo (codigo_barra, nombre) VALUES
    ('750001000001', 'Arroz 1kg'),
    ('750001000002', 'Aceite vegetal 1L'),
    ('750001000003', 'Azúcar 1kg');

INSERT IGNORE INTO existencia (articulo_id, cantidad_existencia)
    SELECT id, CASE codigo_barra WHEN '750001000001' THEN 50 WHEN '750001000002' THEN 30 ELSE 0 END
    FROM articulo WHERE codigo_barra IN ('750001000001', '750001000002', '750001000003');
