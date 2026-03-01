# UI/UX Documentation — Reword AI

> Complete design system, user experience flows, and component specifications  
> App Name: **Reword AI**  
> Last Updated: February 2026  
> Reference Images: `/images/referenses/`

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Component Library](#component-library)
6. [Keyboard Extension UI](#keyboard-extension-ui)
7. [Companion App Screens](#companion-app-screens)
8. [User Flows](#user-flows)
9. [Animations & Transitions](#animations--transitions)
10. [Accessibility](#accessibility)
11. [Responsive Design](#responsive-design)
12. [Iconography](#iconography)

---

## Design Philosophy

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Clarity** | Users instantly understand what's happening with their text |
| **Speed** | Minimal taps to achieve corrections or paraphrase |
| **Trust** | Transparent about data usage, privacy-first design |
| **Consistency** | Same visual language across keyboard and app |

### Visual Identity

- **Theme:** Dark by default (matches reference images)
- **Feel:** Modern, minimal, professional
- **Language:** Russian-first interface
- **Personality:** Helpful AI assistant, not intrusive

---

## Color System

### Primary Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Background Primary** | `#1A1A1A` | `26, 26, 26` | Main keyboard/panel background |
| **Background Secondary** | `#2D2D2D` | `45, 45, 45` | Cards, elevated surfaces |
| **Background Tertiary** | `#3D3D3D` | `61, 61, 61` | Key backgrounds, chips |

### Text Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Text Primary** | `#FFFFFF` | `255, 255, 255` | Main text, headings |
| **Text Secondary** | `#B3B3B3` | `179, 179, 179` | Secondary text, descriptions |
| **Text Tertiary** | `#808080` | `128, 128, 128` | Placeholders, hints |

### Semantic Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Error Red** | `#E35A5A` | `227, 90, 90` | Incorrect/deleted text highlight |
| **Success Green** | `#39C07C` | `57, 192, 124` | Correct/inserted text highlight |
| **Accent Blue** | `#4A90D9` | `74, 144, 217` | Active buttons, links |
| **Accent Purple** | `#9B6DFF` | `155, 109, 255` | PRO features, premium |
| **Warning Orange** | `#F5A623` | `245, 166, 35` | Warnings, quota alerts |

### Diff Highlighting (Key Visual)

Based on reference images:

```
┌─────────────────────────────────────────┐
│  Исходный текст с [ошибкой] выделен     │
│                    ▲                     │
│                    │                     │
│             Red highlight                │
│             background: #E35A5A          │
│             opacity: 0.3                 │
│             border-radius: 4px           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Исправленный текст с [коррекцией]      │
│                         ▲                │
│                         │                │
│                  Green highlight         │
│                  background: #39C07C     │
│                  opacity: 0.3            │
│                  border-radius: 4px      │
└─────────────────────────────────────────┘
```

### Light Theme (Optional)

| Name | Dark | Light |
|------|------|-------|
| Background Primary | `#1A1A1A` | `#FFFFFF` |
| Background Secondary | `#2D2D2D` | `#F5F5F5` |
| Text Primary | `#FFFFFF` | `#1A1A1A` |
| Text Secondary | `#B3B3B3` | `#666666` |

---

## Typography

### Font Family

| Platform | Font | Fallback |
|----------|------|----------|
| iOS | SF Pro Display / SF Pro Text | System |
| Android | Roboto | System |
| Cross-platform | Inter | -apple-system, Roboto |

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| **H1** | 28px | Bold (700) | 34px | Screen titles |
| **H2** | 22px | Semibold (600) | 28px | Section headers |
| **H3** | 18px | Semibold (600) | 24px | Card titles |
| **Body** | 16px | Regular (400) | 22px | Main content |
| **Body Small** | 14px | Regular (400) | 20px | Secondary text |
| **Caption** | 12px | Regular (400) | 16px | Labels, hints |
| **Button** | 16px | Semibold (600) | 20px | Button text |
| **Keyboard Key** | 22px | Regular (400) | 26px | Keyboard letters |

### Special Text Styles

| Style | Properties | Usage |
|-------|------------|-------|
| **Preview Text** | 16px, Regular, 24px line-height | Floating panel text |
| **Mode Chip** | 12px, Medium, uppercase | Mode selection chips |
| **Quota Counter** | 14px, Semibold | "30 paraphrases left" |

---

## Spacing & Layout

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight spacing, icon padding |
| `sm` | 8px | Button padding, chip gaps |
| `md` | 12px | Card padding, section gaps |
| `lg` | 16px | Screen padding, major gaps |
| `xl` | 24px | Section separation |
| `xxl` | 32px | Major screen sections |

### Grid System

- **Screen Padding:** 16px horizontal
- **Card Padding:** 16px all sides
- **Keyboard Panel Height:** 40-55% of screen above keyboard
- **Safe Area:** Respect iOS notch, Android navigation

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 6px | Keys, chips |
| `md` | 12px | Cards, panels |
| `lg` | 16px | Modals, sheets |
| `full` | 50% | Circular buttons, avatars |

---

## Component Library

### 1. Buttons

#### Primary Button
```
┌─────────────────────────────────────┐
│         Добавить клавиатуру         │
└─────────────────────────────────────┘

Specs:
- Background: #4A90D9
- Text: #FFFFFF, 16px Semibold
- Padding: 16px vertical, 24px horizontal
- Border-radius: 12px
- Height: 52px
- Active state: Scale 0.98, opacity 0.9
```

#### Secondary Button
```
┌─────────────────────────────────────┐
│           Может позже               │
└─────────────────────────────────────┘

Specs:
- Background: transparent
- Border: 1px solid #4A90D9
- Text: #4A90D9, 16px Semibold
- Padding: 16px vertical, 24px horizontal
- Border-radius: 12px
```

#### Icon Button (Action Bar)
```
   ┌──────┐
   │  📋  │
   └──────┘

Specs:
- Size: 44x44px (touch target)
- Icon: 24x24px
- Background: #3D3D3D
- Border-radius: 12px
- Active: Background #4D4D4D
```

### 2. Mode Chips (Horizontal Scroller)

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ ✂️ Сокр. │ │ 😊 Друж. │ │ 👔 Форм. │ │ 📝 Расш. │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
     ↑
  Active (highlighted)

Specs:
- Inactive:
  - Background: #3D3D3D
  - Text: #B3B3B3, 12px Medium
  - Padding: 8px 12px
  - Border-radius: 16px (pill shape)
  
- Active:
  - Background: #4A90D9
  - Text: #FFFFFF
  - Border: 2px solid #4A90D9 (glow effect)

Mode Icons & Labels:
- ✂️ Сократить (Shorten)
- 📝 Расширить (Expand)
- 👔 Формальный (Formal)
- 😊 Дружелюбный (Friendly)
- 💪 Уверенный (Confident)
- 💼 Профессиональный (Professional)
- 💬 Разговорный (Colloquial)
- 🤗 Эмпатичный (Empathetic)
```

### 3. Floating Panel (KEY COMPONENT)

Based on reference images:

```
┌─────────────────────────────────────────────────┐
│  Добавьте тепло и дружелюбие                    │ ← Header (mode description)
├─────────────────────────────────────────────────┤
│                                                 │
│  Исходный текст с [ошибками], которые были     │
│  исправлены. Новые [добавленные] слова         │ ← Preview Text Area
│  отображаются зелёным цветом.                  │
│                                                 │
├─────────────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐     │ ← Mode Chips (scroll)
│  │Сокр│ │Друж│ │Форм│ │Расш│ │Увер│ │Проф│ →   │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘     │
├─────────────────────────────────────────────────┤
│   ⌨️        ↩️        ✨        📋        ✅   │ ← Action Bar
│  Клав.    Отмена    Перефр.  Копир.  Вставить  │
└─────────────────────────────────────────────────┘

Specs:
- Height: 40-55% of screen area above keyboard
- Background: #1A1A1A
- Border-radius (top): 20px
- Shadow: 0 -4px 20px rgba(0,0,0,0.3)
- Padding: 16px

Header:
- Text: 14px Semibold, #B3B3B3
- Padding-bottom: 12px

Preview Area:
- Background: #2D2D2D (slightly elevated)
- Border-radius: 12px
- Padding: 16px
- Min-height: 100px
- Max-height: 200px (scrollable)
- Text: 16px Regular, #FFFFFF, line-height 24px

Action Bar Icons:
- ⌨️ Keyboard toggle (return to keyboard)
- ↩️ Undo/Redo
- ✨ Paraphrase (magic wand)
- 📋 Copy to clipboard
- ✅ Confirm insertion (green circle check)
```

### 4. Keyboard Keys

```
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│  й  │  ц  │  у  │  к  │  е  │  н  │  г  │  ш  │  щ  │  з  │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│  ф  │  ы  │  в  │  а  │  п  │  р  │  о  │  л  │  д  │  ж  │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┴────┐
│ ⇧   │  я  │  ч  │  с  │  м  │  и  │  т  │  ь  │  б  │  ю  │ ⌫  │
└─────┴──┬──┴──┬──┴─────┴─────┴─────┴─────┴──┬──┴──┬──┴──┬──┴────┘
         │ 🌐 │         ПРОБЕЛ              │ ✅  │ ⏎   │
         └────┴─────────────────────────────┴─────┴─────┘

Letter Key Specs:
- Size: ~32x42px (varies by row)
- Background: #3D3D3D
- Text: 22px Regular, #FFFFFF
- Border-radius: 6px
- Press state: Background #4D4D4D, scale 1.1
- Shadow (subtle): 0 1px 0 #1A1A1A

Special Keys:
- Shift (⇧): 1.5x width, icon 18px
- Backspace (⌫): 1.5x width, icon 20px
- Space: 4x width
- Globe (🌐): Language switch
- Check (✅): Проверить button (accent color)
- Return (⏎): Standard return
```

### 5. Suggestion Strip

```
┌─────────────────────────────────────────────────┐
│  привет  │  привета  │  приветик  │    Провер. │
└─────────────────────────────────────────────────┘

Specs:
- Height: 44px
- Background: #2D2D2D
- Suggestions:
  - Text: 16px Regular, #FFFFFF
  - Separator: 1px #1A1A1A
  - Padding: 12px horizontal
  - Tap: Background #3D3D3D
  
- "Проверить" button (right side):
  - Background: #39C07C
  - Text: 14px Semibold, #FFFFFF
  - Padding: 8px 16px
  - Border-radius: 8px
```

### 6. Cards

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ⚙️  Настройки темы                            │
│                                                 │
│  Выберите предпочитаемую тему оформления        │
│                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │   Авто     │ │   Тёмная   │ │  Светлая   │   │
│  └────────────┘ └────────────┘ └────────────┘   │
│                      ↑                          │
│               (selected)                        │
└─────────────────────────────────────────────────┘

Specs:
- Background: #2D2D2D
- Border-radius: 16px
- Padding: 20px
- Shadow: none (flat design)
```

### 7. Settings Row

```
┌─────────────────────────────────────────────────┐
│  🔒  Только локальная проверка          [═══]  │
└─────────────────────────────────────────────────┘

Specs:
- Height: 56px
- Background: #2D2D2D
- Border-radius: 12px
- Icon: 24x24px, left 16px
- Text: 16px Regular, #FFFFFF, left 16px
- Toggle/Chevron: right 16px
- Separator: 1px #1A1A1A (between rows)
```

### 8. Alert/Modal

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                 ⚠️                              │
│                                                 │
│         Лимит исчерпан                          │
│                                                 │
│    Вы использовали все бесплатные              │
│    перефразирования в этом месяце.             │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │           Оформить PRO                    │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│                Может позже                      │
│                                                 │
└─────────────────────────────────────────────────┘

Specs:
- Overlay: rgba(0,0,0,0.6)
- Modal:
  - Background: #2D2D2D
  - Border-radius: 20px
  - Padding: 24px
  - Max-width: 320px
  - Center aligned
```

---

## Keyboard Extension UI

### Layout Hierarchy

```
┌─────────────────────────────────────────────────┐
│                                                 │
│           [Current App Text Field]              │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│          ┌─────────────────────────────────┐    │
│          │   FLOATING PANEL (when active)  │    │  40-55%
│          │                                 │    │  screen
│          │   Header                        │    │
│          │   Preview Text Area             │    │
│          │   Mode Chips                    │    │
│          │   Action Bar                    │    │
│          └─────────────────────────────────┘    │
│                                                 │
├─────────────────────────────────────────────────┤
│         Suggestion Strip                         │
├─────────────────────────────────────────────────┤
│                                                 │
│              KEYBOARD AREA                       │
│                                                 │
│   й ц у к е н г ш щ з х                         │
│   ф ы в а п р о л д ж э                         │
│ ⇧ я ч с м и т ь б ю ⌫                          │
│ 123 🌐    ПРОБЕЛ    ✅ ⏎                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### State Flows

#### 1. Default State (Typing)
- Keyboard visible
- Suggestion strip shows autocomplete
- No floating panel

#### 2. Check Initiated
- User taps "✅ Проверить"
- Floating panel slides up
- Panel shows: original text with errors highlighted red
- Corrections shown with green highlights
- Confirm button to apply

#### 3. Paraphrase Initiated
- User taps "✨ Перефразировать"
- Floating panel slides up
- Loading state with spinner
- Result appears with diff highlighting
- Mode chips allow switching modes
- Confirm to insert

#### 4. Paraphrase Complete
- Full result displayed
- User can:
  - Copy (📋)
  - Undo (↩️)
  - Switch mode (chips)
  - Confirm (✅) → inserts text & closes panel
  - Return to keyboard (⌨️)

---

## Companion App Screens

### 1. Onboarding — Welcome

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                                                 │
│                    🎯                           │
│                                                 │
│          Reword AI                              │
│                                                 │
│    Умная клавиатура с AI-перефразировщиком      │
│                                                 │
│    ✓ Мгновенная проверка орфографии            │
│    ✓ Морфологический анализ                     │
│    ✓ AI-перефраз одним нажатием                │
│                                                 │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │         Добавить клавиатуру               │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│            Уже добавлена →                      │
│                                                 │
│     ● ○ ○                                       │
└─────────────────────────────────────────────────┘
```

### 2. Onboarding — Enable Keyboard

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   ←     Как включить клавиатуру                │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │   [Screenshot of iOS/Android Settings]    │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│   1. Откройте Настройки → Основные             │
│   2. Выберите Клавиатура → Клавиатуры          │
│   3. Нажмите "Новые клавиатуры"                │
│   4. Найдите и добавьте "Reword AI"            │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │        Открыть настройки                  │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│     ○ ● ○                                       │
└─────────────────────────────────────────────────┘
```

### 3. Onboarding — Full Access

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   ←     Разрешить полный доступ?               │
│                                                 │
│                    🔐                           │
│                                                 │
│   Для использования облачного перефраза        │
│   требуется "Полный доступ".                   │
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │ ✓ Локальная проверка работает           │   │
│   │   без полного доступа                   │   │
│   │                                         │   │
│   │ ✓ Тексты отправляются только            │   │
│   │   при нажатии "Перефразировать"         │   │
│   │                                         │   │
│   │ ✓ Мы не храним ваши тексты              │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │        Включить полный доступ             │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│          Только локальная проверка →            │
│                                                 │
│     ○ ○ ●                                       │
└─────────────────────────────────────────────────┘
```

### 4. Home — Notes Editor

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   📝  Заметки                    30 перефразов  │
│                                    осталось     │
├─────────────────────────────────────────────────┤
│                                                 │
│   Здесь вы можете протестировать клавиатуру    │
│   с нашими функциями. Введите текст и          │
│   попробуйте проверку или перефраз. |          │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│    [Our Keyboard Appears Here]                  │
├─────────────────────────────────────────────────┤
│                                                 │
│   🏠        📝         ⚙️                       │
│  Главная   Заметки   Настройки                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5. Settings

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   ⚙️  Настройки                                │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│   ВНЕШНИЙ ВИД                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  🎨  Тема оформления              Тёмная >│  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│   КОНФИДЕНЦИАЛЬНОСТЬ                           │
│  ┌───────────────────────────────────────────┐  │
│  │  🔒  Только локально              [═══]   │  │
│  ├───────────────────────────────────────────┤  │
│  │  🗑️  Удалить мои данные                  >│  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│   ПОДПИСКА                                     │
│  ┌───────────────────────────────────────────┐  │
│  │  ⭐  PRO подписка                  Free   │  │
│  │      30 перефразов осталось               │  │
│  │                                           │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │       Оформить PRO • 199 ₽/мес     │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│   О ПРИЛОЖЕНИИ                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  📜  Политика конфиденциальности         >│  │
│  ├───────────────────────────────────────────┤  │
│  │  📄  Условия использования               >│  │
│  ├───────────────────────────────────────────┤  │
│  │  ℹ️  Версия                        1.0.0  │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
├─────────────────────────────────────────────────┤
│   🏠        📝         ⚙️                       │
│  Главная   Заметки   Настройки                 │
└─────────────────────────────────────────────────┘
```

### 6. Subscription/PRO Screen

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   ←     Reword AI PRO                          │
│                                                 │
│                    ⭐                           │
│                                                 │
│          Безлимитный перефраз                   │
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │                                         │   │
│   │  ✓ Неограниченные перефразы             │   │
│   │  ✓ Все режимы перефраза                 │   │
│   │  ✓ Приоритетная обработка               │   │
│   │  ✓ Без рекламы                          │   │
│   │                                         │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │         199 ₽ / месяц                     │  │
│  │                                           │  │
│  │         Оформить подписку                 │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│    Отменить можно в любой момент в             │
│    настройках App Store / Google Play          │
│                                                 │
│         Восстановить покупки                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## User Flows

### Flow A: First Launch (Onboarding)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Install   │────▶│   Welcome   │────▶│   Enable    │────▶│    Full     │
│     App     │     │   Screen    │     │   Keyboard  │     │   Access    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                          │                   │                    │
                          │                   │                    │
                          ▼                   ▼                    ▼
                    "Add Keyboard"    "Open Settings"     "Enable" / "Local Only"
                                             │                    │
                                             ▼                    ▼
                                      OS Settings ───────▶ Home Screen
```

### Flow B: Quick Check (Spellcheck)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Typing    │────▶│   Tap ✅    │────▶│   Panel     │────▶│   Confirm   │
│   in App    │     │  "Проверить"│     │  shows diff │     │     ✅      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                              │                    │
                                              │                    ▼
                                              │              Text inserted
                                              │              Panel closes
                                              │
                                              ▼
                                        Red = errors
                                        Green = fixes
```

### Flow C: Paraphrase

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Typing    │────▶│   Tap ✨    │────▶│   Loading   │────▶│   Result    │
│   in App    │     │ "Перефраз"  │     │    ...      │     │    Panel    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                          ┌────────────────────────────────────────┤
                          │                                        │
                          ▼                                        ▼
                   Select Mode Chip               ┌─────────────────────────┐
                   (Friendly, Formal, etc.)       │   Copy    │   Confirm  │
                          │                       │    📋     │     ✅     │
                          │                       └─────────────────────────┘
                          │                                        │
                          ▼                                        ▼
                    Re-paraphrase                           Text inserted
                    with new mode                           Panel closes
```

### Flow D: Subscription Purchase

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Quota     │────▶│   PRO       │────▶│   In-App    │────▶│   Success   │
│  Exceeded   │     │   Screen    │     │  Purchase   │     │     ✅      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                    │
      ▼                   ▼                   ▼                    ▼
 "Оформить PRO"      "199 ₽/мес"        Apple/Google         Unlocked!
    alert                           Payment Sheet
```

---

## Animations & Transitions

### Panel Slide Up

```javascript
// Floating panel entrance
animation: {
  type: "spring",
  damping: 20,
  stiffness: 300,
  duration: 300ms
}

// From: translateY(100%), opacity: 0
// To: translateY(0%), opacity: 1
```

### Key Press

```javascript
// Key tap feedback
animation: {
  scale: 1.1,
  duration: 50ms,
  backgroundColor: "#4D4D4D"
}
```

### Mode Chip Selection

```javascript
// Chip activation
animation: {
  scale: 1.05,
  duration: 150ms,
  backgroundColor: "#4A90D9", // from #3D3D3D
}
```

### Loading Spinner

```javascript
// Paraphrase loading
animation: {
  rotate: 360deg,
  duration: 1000ms,
  easing: "linear",
  repeat: infinite
}
```

### Success Checkmark

```javascript
// Confirm insertion
animation: {
  scale: [1, 1.2, 1],
  duration: 300ms,
  haptic: "success"
}
```

---

## Accessibility

### Touch Targets

| Element | Minimum Size |
|---------|-------------|
| Buttons | 44x44px |
| Keys | 32x42px (acceptable for keyboards) |
| Chips | 32x32px + 12px padding |

### Color Contrast

| Text/Background | Ratio | Requirement |
|-----------------|-------|-------------|
| White on #1A1A1A | 15.5:1 | ✅ AAA |
| #B3B3B3 on #1A1A1A | 7.8:1 | ✅ AAA |
| #E35A5A on #1A1A1A | 4.8:1 | ✅ AA |
| #39C07C on #1A1A1A | 7.2:1 | ✅ AAA |

### VoiceOver/TalkBack

- All buttons have accessibility labels
- Mode chips announce: "Дружелюбный режим, выбрано"
- Diff text announces: "Слово 'ошибка' исправлено на 'правильно'"

### Reduced Motion

- Respect `prefers-reduced-motion`
- Provide instant transitions as fallback
- Loading states use simpler animations

---

## Responsive Design

### Screen Size Adaptations

| Screen | Keyboard Height | Panel Height | Key Size |
|--------|-----------------|--------------|----------|
| iPhone SE | 216px | 40% screen | 28px |
| iPhone 14 | 291px | 45% screen | 32px |
| iPhone 14 Pro Max | 291px | 50% screen | 34px |
| Android Small | 200px | 40% screen | 28px |
| Android Large | 260px | 50% screen | 32px |

### Safe Areas

- iOS: Respect bottom safe area for home indicator
- Android: Account for navigation bar
- Notch: Panel header clears sensor area

---

## Iconography

### Icon Set

Using SF Symbols (iOS) and Material Icons (Android) with custom alternatives:

| Action | Icon | Size |
|--------|------|------|
| Keyboard | ⌨️ `keyboard` | 24px |
| Check/Confirm | ✅ `checkmark.circle.fill` | 24px |
| Paraphrase | ✨ `wand.and.stars` | 24px |
| Copy | 📋 `doc.on.doc` | 24px |
| Undo | ↩️ `arrow.uturn.backward` | 24px |
| Settings | ⚙️ `gearshape` | 24px |
| Close | ✕ `xmark` | 20px |
| Shorten | ✂️ `scissors` | 20px |
| Expand | 📝 `text.expand` | 20px |
| Friendly | 😊 `face.smiling` | 20px |
| Formal | 👔 `briefcase` | 20px |
| Lock | 🔒 `lock` | 24px |
| Star/PRO | ⭐ `star.fill` | 24px |

---

## Reference Images Mapping

Based on files in `/images/referenses/`:

| File | Content |
|------|---------|
| `5235554272311710823.jpg` | Floating panel with diff view |
| `5235554272311710824.jpg` | Mode chips horizontal scroller |
| `5235554272311710838.jpg` | Dark theme keyboard layout |
| `5235554272311710839.jpg` | Action bar icons |
| `5235554272311711237.jpg` | Onboarding screen 1 |
| `5235554272311711239.jpg` | Settings screen |
| `5235554272311711240.jpg` | Full Access explanation |

---

## Design Assets Checklist

### Required Assets

- [ ] App icon (1024x1024 + all sizes)
- [ ] Keyboard icon (for iOS settings)
- [ ] Onboarding illustrations (3 screens)
- [ ] Mode icons (8 total)
- [ ] Action bar icons (5 total)
- [ ] App Store screenshots (6.5", 5.5")
- [ ] Play Store screenshots (phone, tablet)
- [ ] Feature graphic (1024x500)

### Export Formats

| Asset Type | iOS | Android |
|------------|-----|---------|
| Icons | PDF (vector) | XML (vector drawable) |
| Images | @1x, @2x, @3x PNG | mdpi, hdpi, xhdpi, xxhdpi |
| Animations | Lottie JSON | Lottie JSON |

---

*Document maintained by Design Team*  
*Reference: [PRD.md](PRD.md) | [AppMap.md](AppMap.md) | [Implementation.md](Implementation.md)*  
*Reference Images: `/images/referenses/`*
