# La vela y la segadora

Animación generativa en el navegador: una vela cuya flama ondula y mueve luces y sombras, código que se escribe en el paisaje oscuro, píxeles que gotean del filo de la guadaña y un réquiem algorítmico hecho con Web Audio.

Sin dependencias ni compilación: HTML, Canvas 2D y JavaScript puro.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Página y animación (canvas) |
| `music.js` | Música generativa (Web Audio API) |
| `scene.jpg` | Ilustración base, con la flama retirada |
| `flame.png` | Flama recortada con transparencia, se deforma en tiempo real |

## Uso

- **Clic en la imagen**: pausa / reanuda.
- **Botón ♪ sonido**: activa / silencia la música (el navegador exige un clic para reproducir audio).

## Verlo en local

Abrir `index.html` directamente puede bloquear la carga de imágenes en algunos navegadores; mejor con un servidor:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Publicar con GitHub Pages

1. Sube estos archivos a la raíz de un repositorio.
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. En un par de minutos estará en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

## Música

Re frigio a 66 BPM. Campana fúnebre FM, latido grave, arpegio con ritmos euclidianos y notas elegidas por un LFSR que muta cada 8 compases, chisporroteo ligado a la intensidad de la flama, campanitas cuando una gota de píxeles toca el suelo y glitches cuando aparece código.
