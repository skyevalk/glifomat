# Глифомат — заметки для Claude Code

Браузерный ASCII-редактор без сборщиков и зависимостей: чистые HTML/CSS/JS, всё работает статикой (GitHub Pages).

## Как запускать
- Локально: `python3 -m http.server 5173` в корне, открыть http://localhost:5173 (или `./start.command` на маке).
- Однофайловая версия: `python3 tools/build.py` → `dist/glifomat.html` (её публикуют как артефакт claude.ai).

## Архитектура
- `js/engine.js` — `GlyphomatEngine(window)` объявляет `window.Glyphomat.create(canvas)` → `{render(src,S,t,mouse,rec), svg(...), invalidate(), dispose()}`.
  Конвейер в `render`: исходник → буфер качества → WebGL-слои (`S.layers`, режим `fx` подмешивается в исходник) → сетка сэмплов →
  тон и FX → дизеринг → отрисовка стиля → покраска → композит (слои `sep` под/над, свечение).
  Движок не трогает DOM интерфейса. HTML-экспорт вшивает его через `GlyphomatEngine.toString()`, поэтому всё нужное движку должно жить внутри этой функции.
- `js/app.js` — состояние `S` (дефолты в `DEF`, слои в `LDEF`), билдеры контролов `slider/seg/select/text/check/colorPick`
  (видимость через предикат `when(S)`), вкладки слоёв, пресеты (`PRESETS` + localStorage `glifomat:presets`), экспорт.
  Сохранение файлов: через `claude.use("downloads")`, если страница открыта артефактом в claude.ai, иначе обычная ссылка-скачивание.
- WebGL-слои — фрагментные шейдеры WebGL1 в `GL_FX` (engine.js), общие юниформы: `uRes uTime uMouse uInt uSpread uPulse uMInf uGrain uCol`, у Network Dome ещё `uP[36]` (точки считает JS).

## Как добавлять
- Новый параметр: дефолт в `DEF`, контрол в нужной секции `app.js`, чтение в `engine.js`. Не забыть случайный набор и пресеты, если уместно.
- Новый WebGL-слой: функция `float fx(vec2 uv,vec2 m,float mOn,float t)` в `GL_FX`, пункт в `LTYPES` в `app.js`.
- Новый стиль: ветка в шаге «5. draw» в `render`, кнопка в секции «Стиль», при необходимости поднастройки с `when`.

## Дизайн интерфейса
Плиточная доска по референсу: графит `--plate/--tile`, приглушённый синий `--slate` для активного и бренд-плитки, тёплый серый `--stone` для плитки экспорта, шрифт Martian Mono капсом. Значения ползунков в виде «значение / максимум». Интерфейс на русском.
