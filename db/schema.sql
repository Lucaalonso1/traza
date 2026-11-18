-- Traza · esquema MySQL 8
-- Comunidad de esquiadores: estaciones, spots y rutas (geometría espacial),
-- publicaciones con clips y fotos, social (seguir, me gusta, comentarios,
-- guardados), informes de nieve y el recomendador de esquís.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS recomendaciones, garaje, valoraciones, esquis, informes_nieve, guardados,
  me_gusta, comentarios, medios, publicaciones, spots, estaciones, seguimientos, sesiones, usuarios;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE usuarios (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(30)  NOT NULL UNIQUE,
  nombre        VARCHAR(80)  NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  pass_hash     VARCHAR(100) NOT NULL,
  bio           VARCHAR(280) NULL,
  color         CHAR(7)      NOT NULL DEFAULT '#f2774a',
  avatar_url    VARCHAR(255) NULL,
  altura_cm     SMALLINT UNSIGNED NULL,
  peso_kg       SMALLINT UNSIGNED NULL,
  nivel         TINYINT UNSIGNED NULL,          -- 0 principiante … 3 experto
  estilo        VARCHAR(20)  NULL,               -- pista, allmountain, fuerapista, freeride, park
  estacion_casa INT UNSIGNED NULL,
  creado_en     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sesiones (
  token_hash  CHAR(64)     PRIMARY KEY,           -- sha256 del token de la cookie
  usuario_id  INT UNSIGNED NOT NULL,
  expira_en   DATETIME     NOT NULL,
  creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX (expira_en)
) ENGINE=InnoDB;

CREATE TABLE seguimientos (
  seguidor_id INT UNSIGNED NOT NULL,
  seguido_id  INT UNSIGNED NOT NULL,
  creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (seguidor_id, seguido_id),
  FOREIGN KEY (seguidor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (seguido_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
  CHECK (seguidor_id <> seguido_id)
) ENGINE=InnoDB;

CREATE TABLE estaciones (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(60)  NOT NULL UNIQUE,
  nombre      VARCHAR(80)  NOT NULL,
  pais        VARCHAR(40)  NOT NULL,
  region      VARCHAR(60)  NOT NULL,
  ubicacion   POINT        NOT NULL SRID 4326,
  cota_min    SMALLINT UNSIGNED NOT NULL,
  cota_max    SMALLINT UNSIGNED NOT NULL,
  km_pistas   SMALLINT UNSIGNED NOT NULL,
  descripcion VARCHAR(400) NOT NULL,
  boletin_url VARCHAR(255) NOT NULL,              -- boletín oficial de aludes de la zona
  SPATIAL INDEX (ubicacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE usuarios ADD FOREIGN KEY (estacion_casa) REFERENCES estaciones(id) ON DELETE SET NULL;

CREATE TABLE spots (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estacion_id INT UNSIGNED NOT NULL,
  autor_id    INT UNSIGNED NOT NULL,
  nombre      VARCHAR(90)  NOT NULL,
  tipo        ENUM('ruta','spot') NOT NULL,       -- ruta = línea; spot = punto
  descripcion TEXT         NOT NULL,
  dificultad  ENUM('roja','negra','doble_negra','alpina') NOT NULL,
  orientacion ENUM('N','NE','E','SE','S','SO','O','NO') NOT NULL,
  desnivel_m  SMALLINT UNSIGNED NULL,
  geom        GEOMETRY     NOT NULL SRID 4326,     -- LINESTRING o POINT
  creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estacion_id) REFERENCES estaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (autor_id)    REFERENCES usuarios(id)   ON DELETE CASCADE,
  SPATIAL INDEX (geom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE publicaciones (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  autor_id    INT UNSIGNED NOT NULL,
  estacion_id INT UNSIGNED NULL,
  spot_id     INT UNSIGNED NULL,
  tipo        ENUM('clip','foto','ruta','informe') NOT NULL,
  texto       VARCHAR(1000) NOT NULL DEFAULT '',
  creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (autor_id)    REFERENCES usuarios(id)   ON DELETE CASCADE,
  FOREIGN KEY (estacion_id) REFERENCES estaciones(id) ON DELETE SET NULL,
  FOREIGN KEY (spot_id)     REFERENCES spots(id)      ON DELETE SET NULL,
  INDEX (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE medios (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  publicacion_id INT UNSIGNED NOT NULL,
  tipo           ENUM('video','imagen') NOT NULL,
  url            VARCHAR(255) NOT NULL,
  poster_url     VARCHAR(255) NULL,
  orden          TINYINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE comentarios (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  publicacion_id INT UNSIGNED NOT NULL,
  autor_id       INT UNSIGNED NOT NULL,
  texto          VARCHAR(500) NOT NULL,
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (autor_id)       REFERENCES usuarios(id)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE me_gusta (
  usuario_id     INT UNSIGNED NOT NULL,
  publicacion_id INT UNSIGNED NOT NULL,
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, publicacion_id),
  FOREIGN KEY (usuario_id)     REFERENCES usuarios(id)      ON DELETE CASCADE,
  FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE guardados (
  usuario_id INT UNSIGNED NOT NULL,
  spot_id    INT UNSIGNED NOT NULL,
  creado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, spot_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (spot_id)    REFERENCES spots(id)    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE informes_nieve (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estacion_id INT UNSIGNED NOT NULL,
  autor_id    INT UNSIGNED NOT NULL,
  fecha       DATE         NOT NULL,
  tipo_nieve  ENUM('polvo','dura','primavera','hielo','costra','venteada') NOT NULL,
  calidad     TINYINT UNSIGNED NOT NULL CHECK (calidad BETWEEN 1 AND 5),
  nota        VARCHAR(280) NOT NULL DEFAULT '',
  creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estacion_id) REFERENCES estaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (autor_id)    REFERENCES usuarios(id)   ON DELETE CASCADE,
  INDEX (estacion_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE esquis (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  marca     VARCHAR(40) NOT NULL,
  modelo    VARCHAR(60) NOT NULL,
  estilo    VARCHAR(20) NOT NULL,
  patin_mm  TINYINT UNSIGNED NOT NULL,
  radio_m   DECIMAL(4,1) NOT NULL,
  rigidez   TINYINT UNSIGNED NOT NULL,
  nivel_min TINYINT UNSIGNED NOT NULL,
  nivel_max TINYINT UNSIGNED NOT NULL,
  UNIQUE (marca, modelo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE valoraciones (
  usuario_id INT UNSIGNED NOT NULL,
  esqui_id   INT UNSIGNED NOT NULL,
  tipo_nieve ENUM('polvo','dura','primavera','hielo','costra','venteada') NOT NULL,
  nota       TINYINT UNSIGNED NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario VARCHAR(280) NOT NULL DEFAULT '',
  creado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, esqui_id, tipo_nieve),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (esqui_id)   REFERENCES esquis(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE garaje (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT UNSIGNED NOT NULL,
  esqui_id    INT UNSIGNED NULL,                  -- NULL si la IA propuso un modelo fuera del catálogo
  clave       VARCHAR(120) NOT NULL,              -- marca-modelo normalizado
  marca       VARCHAR(40)  NOT NULL,
  modelo      VARCHAR(60)  NOT NULL,
  categoria   VARCHAR(30)  NOT NULL,
  longitud_cm SMALLINT UNSIGNED NOT NULL,
  patin_mm    SMALLINT UNSIGNED NOT NULL,
  radio_m     DECIMAL(4,1) NOT NULL,
  encaje      TINYINT UNSIGNED NOT NULL,
  por_que     VARCHAR(600) NOT NULL,
  perfil      JSON         NULL,
  nota        VARCHAR(200) NOT NULL DEFAULT '',
  creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (usuario_id, clave),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (esqui_id)   REFERENCES esquis(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE recomendaciones (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NULL,
  perfil     JSON         NOT NULL,
  fuente     ENUM('ia','catalogo') NOT NULL,
  resultado  JSON         NOT NULL,
  creado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;
