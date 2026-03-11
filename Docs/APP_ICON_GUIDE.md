# Иконка и Splash Screen — Руководство по добавлению

## Расположение файлов

Все графические ресурсы находятся в папке:
```
mobile/assets/
```

## Необходимые файлы

### 1. `icon.png` — Основная иконка приложения
- **Размер**: 1024×1024 px
- **Формат**: PNG (без прозрачности)
- **Скругление**: НЕ добавлять — iOS и Android скругляют автоматически
- **Рекомендации**: Логотип по центру на фоне `#0D0D0D` (тёмный) или `#9B6DFF` (фирменный фиолетовый)

### 2. `adaptive-icon.png` — Android Adaptive Icon (передний план)
- **Размер**: 1024×1024 px
- **Формат**: PNG с прозрачным фоном (alpha channel)
- **Safe zone**: Основной контент должен быть в центральных 66% (круг диаметром ~680px)
- **Фон**: Задаётся в `app.json` → `android.adaptiveIcon.backgroundColor` (сейчас `#1A1A1A`)
- **Примечание**: Android обрезает иконку в разные формы (круг, квадрат, капля) — держите контент в safe zone

### 3. `splash-icon.png` — Иконка на экране загрузки
- **Размер**: 200×200 px (рекомендуется) — можно до 400×400
- **Формат**: PNG с прозрачным фоном
- **Фон**: Задаётся в `app.json` → `splash.backgroundColor` (сейчас `#0D0D0D`)
- **Поведение**: Отображается по центру экрана при холодном запуске

### 4. `favicon.png` — Иконка для веб-версии (PWA)
- **Размер**: 48×48 px
- **Формат**: PNG
- **Где используется**: Только в веб-версии (Expo web)

## Как заменить иконки

1. Подготовьте изображения в указанных размерах и формате
2. Поместите файлы в `mobile/assets/`, ЗАМЕНИВ существующие:
   ```
   mobile/assets/icon.png          ← 1024×1024, без прозрачности
   mobile/assets/adaptive-icon.png ← 1024×1024, с прозрачным фоном
   mobile/assets/splash-icon.png   ← 200×200, с прозрачным фоном
   mobile/assets/favicon.png       ← 48×48
   ```
3. Запустите `npx expo prebuild --clean` для генерации нативных ресурсов
4. Постройте приложение: `npx eas build --platform android --profile preview`

## Конфигурация в app.json

Все пути и настройки иконок определены в `mobile/app.json`:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#0D0D0D"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1A1A1A"
      }
    }
  }
}
```

## Изменение цвета фона

- **Splash-экран**: Измените `splash.backgroundColor` в `app.json`
- **Adaptive icon (Android)**: Измените `android.adaptiveIcon.backgroundColor` в `app.json`
- **Брендированный splash (в коде)**: Фон `#0D0D0D` задан в `mobile/app/_layout.tsx` в `splashStyles.container`

## Инструменты для создания

- [Figma](https://figma.com) — дизайн иконок
- [Icon Kitchen](https://icon.kitchen) — генератор adaptive icons для Android
- [App Icon Generator](https://www.appicon.co) — генерация всех разрешений из одного файла
- [Remove.bg](https://remove.bg) — удаление фона для прозрачных PNG

## Проверка

После замены файлов и пересборки:
1. Проверьте иконку в лаунчере Android
2. Проверьте splash screen при холодном запуске
3. Проверьте адаптивную иконку в разных формах (круг, квадрат) — Settings → Display → Icon shape
