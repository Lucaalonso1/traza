<p align="center">
  <img src="docs/traza-presentacion.png" alt="Traza — La comunidad de esquiadores" width="100%">
</p>

# Traza — la comunidad de esquiadores

Red social para esquiadores: spots y rutas fuera de pista sobre un mapa, clips y fotos de cada estación, informes de nieve del día, perfiles, seguidores y «gemelos de nieve» (esquiadores con tu físico y tu estilo). Como extra, un asesor con IA que elige tus esquís cruzando tu físico con un catálogo de 27 modelos y con las valoraciones de esquiadores parecidos a ti.

**Next.js 15** (JavaScript) · **MySQL 8.4** con datos espaciales · **MapLibre** · **Claude** (Anthropic) · modo claro y oscuro

<p align="center">
  <img src="docs/capturas/intro.jpg" alt="Intro: la palabra TRAZA con la foto dentro de las letras" width="49%">
  <img src="docs/capturas/inicio.jpg" alt="Portada de Traza" width="49%">
</p>

## Capturas

| Feed | Mapa de spots y rutas |
|---|---|
| ![Explorar](docs/capturas/explorar.jpg) | ![Mapa](docs/capturas/mapa.jpg) |

| Estación | Spot (ruta fuera de pista) |
|---|---|
| ![Estación](docs/capturas/estacion.jpg) | ![Spot](docs/capturas/spot.jpg) |

| Perfil | Elige tu esquí (modo claro) |
|---|---|
| ![Perfil](docs/capturas/perfil.jpg) | ![Recomendador](docs/capturas/recomendador.jpg) |

| Modo claro | Móvil |
|---|---|
| ![Explorar en modo claro](docs/capturas/explorar-claro.jpg) | <img src="docs/capturas/movil.jpg" width="48%"> <img src="docs/capturas/movil-mapa.jpg" width="48%"> |

## Qué incluye

- **Explorar:** feed con clips, fotos, rutas e informes de nieve, filtrable entre «Todo» y «Siguiendo». Incluye «me gusta», comentarios y compartir.
- **Mapa:** satélite, topográfico y oscuro, con las estaciones y los spots y rutas coloreados por dificultad, un buscador y filtros.
- **Estaciones:** spots, clips, informes de nieve del día y enlace al boletín oficial de aludes.
- **Spots:** ruta sobre el mapa, dificultad, orientación y desnivel, botón para guardarla y spots cercanos calculados con una consulta espacial.
- **Publicar:** clips o fotos; rutas dibujadas sobre el mapa o importadas desde GPX; e informes de nieve.
- **Perfiles:** estadísticas, seguidores, spots guardados y gemelos de nieve.
- **Elige tu esquí:** recomendador por pasos. Con `ANTHROPIC_API_KEY` usa Claude; sin ella, un motor local. En los dos casos muestra la nota que dan a cada esquí los esquiadores parecidos a ti.
- **Garaje:** esquís guardados del recomendador, con notas.

## Arrancar

Necesitas Node 22 y Docker.

```bash
npm install
npm run db:up      # MySQL (puerto 3307) y el visor Adminer (puerto 8080) en Docker
npm run db:reset   # crea el esquema y carga los datos de demostración
npm run dev        # http://localhost:3000
```

Crea `.env.local` a partir de `.env.example`:

```
DATABASE_URL=mysql://traza:traza_dev@127.0.0.1:3307/traza
ANTHROPIC_API_KEY=        # opcional: activa el agente de IA del recomendador
```

### Cuentas de demostración

Todas usan la contraseña `traza2026`. Puedes entrar con el usuario o con el correo `usuario@demo.traza.test`.

`luca.alonso` · `marta.freeride` · `pau.aran` · `lucia.nevada` · `jon.pirineo` · `ines.park` · `alex.backcountry`

## Ver la base de datos

Con `npm run db:up` arranca también **Adminer**, un visor web:

1. Abre http://localhost:8080.
2. Sistema **MySQL**, servidor `mysql`, usuario `traza`, contraseña `traza_dev`, base de datos `traza`.
3. Verás las 15 tablas. Haz clic en una y luego en «Seleccionar datos» para ver sus filas, o usa «Comando SQL» para lanzar consultas.

También puedes conectarte con cualquier cliente (TablePlus, MySQL Workbench, DBeaver…) a `127.0.0.1`, puerto `3307`, con el mismo usuario y contraseña. Desde la terminal:

```bash
docker exec -it traza-mysql mysql -utraza -ptraza_dev traza
```

> Las contraseñas de los usuarios **no se pueden leer**: se guardan cifradas con bcrypt en `usuarios.pass_hash`, como en cualquier aplicación real. Solo se puede comprobar si una contraseña es correcta. Las de demostración son todas `traza2026` (ver `db/seed.mjs`).

## Base de datos (15 tablas)

| Tabla | Para qué |
|---|---|
| `usuarios` | Cuenta, foto, bio, físico (altura, peso, nivel, estilo) y estación de casa |
| `sesiones` | Sesiones iniciadas (se guarda el hash SHA-256 del token de la cookie) |
| `seguimientos` | Quién sigue a quién |
| `estaciones` | Estaciones con ubicación `POINT` (SRID 4326), cotas y enlace al boletín de aludes |
| `spots` | Spots (`POINT`) y rutas (`LINESTRING`) con dificultad, orientación y desnivel |
| `publicaciones` | Clips, fotos, rutas e informes que aparecen en el feed |
| `medios` | Archivos de cada publicación (vídeo o imagen) |
| `comentarios`, `me_gusta`, `guardados` | Interacción social |
| `informes_nieve` | Estado de la nieve por estación y día |
| `esquis`, `valoraciones` | Catálogo y notas de la comunidad por tipo de nieve |
| `garaje` | Esquís guardados desde el recomendador |
| `recomendaciones` | Historial de recomendaciones (perfil, fuente y resultado en JSON) |

Consultas destacadas, en [`lib/server/queries.js`](lib/server/queries.js):

- **Espacial:** spots cercanos con `ST_Distance_Sphere` y geometría servida como GeoJSON con `ST_AsGeoJSON`.
- **Gemelos de nieve:** distancia entre perfiles (altura, peso, nivel y estilo).
- **Recomendador con la comunidad:** media de las valoraciones de esquiadores con físico parecido, por esquí y tipo de nieve.
- **Feed:** publicaciones de la gente que sigues, con contadores y medios agregados con `JSON_ARRAYAGG`.

## Estructura

```
app/            páginas (explorar, mapa, estaciones, spots, publicar, u/[usuario], recomendador…) y rutas /api
components/     interfaz: Hero (intro), Nav, mapa MapLibre, feed, publicaciones, recomendador
lib/server/     conexión a MySQL, sesiones con bcrypt y consultas
db/             schema.sql y seed.mjs (datos de demostración)
public/media/   foto del hero, clips y fotos de demostración
docs/           imagen de marca y capturas del README
```

## Seguridad y responsabilidad

- Contraseñas con bcrypt. Sesiones en una cookie `httpOnly` con `SameSite=Lax`.
- Subidas limitadas por tipo y tamaño (80 MB para vídeo y 12 MB para imagen), y renombradas con un UUID.
- Cada estación y cada spot enlaza al boletín oficial de peligro de aludes y avisa de que el terreno fuera de pista no está controlado.

## Desarrollo

- **Tema:** el botón de la barra de navegación cambia entre modo claro y oscuro, y la elección se guarda en `localStorage` (`traza.theme`). Si no eliges, se sigue al sistema. En una URL puedes forzarlo con `?tema=claro` o `?tema=oscuro`.
- **Intro:** se reproduce una vez por sesión. En desarrollo, `/?introDebug` la congela para revisarla fotograma a fotograma.
- `NEXT_DIST_DIR=.next-build npx next build` compila en otra carpeta sin interferir con `npm run dev`.

## Créditos

Mapas: imágenes de satélite © Esri, Maxar, Earthstar Geographics · © OpenStreetMap · OpenTopoMap (CC-BY-SA). Foto del hero reescalada con [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN).
