# Protocolo de prueba manual — PoC de postura

**Objetivo:** comprobar en un iPhone real que la app clasifica la sentadilla como lo haría el coach, que responde rápido y que retira el feedback cuando no ve a la persona.

## Criterios de aceptación

| Criterio | Meta |
| --- | --- |
| Coincidencia con el coach (clasificación **e** indicación principal) | **≥ 12 de 15** repeticiones |
| Tiempo de respuesta desde que se estabiliza la posición inferior | **< 1 s** en cada repetición evaluada |
| Pérdida de visibilidad (prueba separada) | El feedback desaparece y aparece «Ajusta tu posición…» en todos los casos |

## Preparación

- iPhone con el development build instalado (ver [README.md](README.md)), sujeto en trípode o apoyado, en vertical, a la altura de la cadera.
- Espacio iluminado, fondo despejado, la persona de **perfil** a 2–3 m, con el cuerpo completo en cuadro.
- Coach y participantes muestran **el mismo lado** a la cámara (anótalo).
- En la app, toca **Datos** para ver ángulos, fps, inferencia y «Respuesta última evaluación». Comprueba que la orientación indica `up`.
- Tolerancia: ±15° (valor por defecto; anótalo si se cambia).
- Un observador anota los resultados; el coach decide la clasificación esperada **antes** de mirar la pantalla.

## 1. Captura de referencia (una vez por sesión)

1. Paso «1 Referencia»: el coach se coloca de pie, de perfil, hasta que los cuatro puntos aparezcan en verde.
2. Baja en una sentadilla sin peso y hace una pausa de ~1 s abajo.
3. Aparece «Referencia capturada» con rodilla y tronco. Anota los valores.
4. Si la postura no fue buena, **Repetir captura**; si es correcta, **Guardar referencia**.

## 2. Repeticiones: 3 personas × 5 repeticiones

Cada participante hace las 5 repeticiones siguientes, en este orden, pausando ~1 s abajo y volviendo de pie entre repeticiones. El coach indica la variante antes de cada una.

| # | Variante que pide el coach | Resultado esperado de la app |
| --- | --- | --- |
| 1 | Igual que la referencia | «Postura dentro del objetivo» |
| 2 | Igual que la referencia | «Postura dentro del objetivo» |
| 3 | Rodilla: quedarse claramente más arriba (~¼ de sentadilla menos) | «Baja más: flexiona más las rodillas» |
| 4 | Tronco: inclinarse claramente más hacia delante | «Endereza el tronco: te estás inclinando de más» |
| 5 | Una desviación a elección del coach: bajar de más **o** tronco más erguido | «No bajes tanto: sube un poco la cadera» **o** «Inclina un poco más el tronco hacia delante» |

Para cada repetición registra:
- **Clasificación del coach** (dentro / desviación de rodilla / desviación de tronco) y su **indicación principal**.
- **Mensaje de la app**.
- **Respuesta** (ms) del panel Datos. Mide lo que pasa desde que empieza la pausa estable hasta que se muestra el mensaje.
- **Coincide** (sí/no): sí solo si coinciden la clasificación y la indicación principal.

Opcional: graba la pantalla del iPhone (Centro de control) o un video lateral para revisar casos dudosos y comprobar el tiempo de respuesta con el reloj del video.

### Hoja de registro

Referencia: rodilla ____° · tronco ____° · lado ________ · tolerancia ±____°

| Persona | # | Coach: clasificación / indicación | App: mensaje | Respuesta (ms) | ¿Coincide? |
| --- | --- | --- | --- | --- | --- |
| P1 | 1 | | | | |
| P1 | 2 | | | | |
| P1 | 3 | | | | |
| P1 | 4 | | | | |
| P1 | 5 | | | | |
| P2 | 1 | | | | |
| P2 | 2 | | | | |
| P2 | 3 | | | | |
| P2 | 4 | | | | |
| P2 | 5 | | | | |
| P3 | 1 | | | | |
| P3 | 2 | | | | |
| P3 | 3 | | | | |
| P3 | 4 | | | | |
| P3 | 5 | | | | |
| **Total** | | | | **máx.: ____** | **____ / 15** |

## 3. Pérdida de visibilidad (prueba separada)

Con la referencia guardada y un mensaje de feedback en pantalla:

| Caso | Cómo provocarlo | Esperado |
| --- | --- | --- |
| A | La persona sale del cuadro | En < 1 s desaparece el feedback y aparece «Ajusta tu posición…» |
| B | Tapar la cámara con la mano | Igual que A |
| C | Ocultar el tobillo (por ejemplo, tapándolo con un objeto) | Igual que A y el aviso nombra «tobillo»; el chip «Tobillo» pasa a rojo |
| D | La persona gira y muestra el otro lado del cuerpo | Igual que A; no evalúa con el lado contrario |
| E | Tras A–D, la persona vuelve agachada | No evalúa hasta que se pone de pie y repite la sentadilla |

Registra sí/no por caso. Meta: 5/5.

## 4. Conclusión

- Coincidencias: ____ / 15 (meta ≥ 12) · Respuesta máxima: ____ ms (meta < 1000) · Visibilidad: ____ / 5
- Si la meta no se cumple, anota qué variante falla y los ángulos que mostraba Datos. Ajustar tolerancia o umbrales (`src/assessment/config.ts`) es el primer paso antes de cambiar de modelo.
