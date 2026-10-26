# ✧ Z Ξ N I T ✧ Singularity Card Engine

![Version](https://img.shields.io/badge/Version-18.17.0-00fbff?style=for-the-badge&logo=home-assistant)
![HACS](https://img.shields.io/badge/HACS-Compatible-E64A9C?style=for-the-badge)
![Zero Dependencies](https://img.shields.io/badge/Pure_Code-Zero_Bloat-00ffaa?style=for-the-badge)

High-performance, zero-dependency **Cyberpunk / Glassmorphism** custom card engine for Home Assistant. Built exclusively with pure Vanilla JavaScript and CSS animations—no external frameworks, no bloat, and instant DOM updates.

---

## ⚡ Key Features

* **🚀 Turbo Script & Click Caching:** Inline JS templates (`[[[ ... ]]]`) and click actions (`data-click`) are compiled once via `Function` caching—eliminating memory leaks and UI freezes.
* **🎯 Selective Entity Tracking:** Automatically parses and tracks `[[domain.entity]]` and `states['domain.entity']` references. The DOM only re-renders when tracked states actually change.
* **🧩 Native Card Nesting (`#slot-X`):** Embed any native or custom Lovelace card inside your HTML template without race conditions.
* **📳 Kiosk-Ready Haptics & TTS:** Built-in tactile scale/brightness feedback, vibration support, Scroll-Guard (prevents accidental triggers while scrolling on touchscreens), and native SpeechSynthesis (`data-speak`).
* **🎨 Full Border & Glow Control:** Easily switch between glowing neon cyberpunk frames and clean, borderless glassmorphism layouts.

---

## 📦 Installation

### Option 1: HACS (Recommended)
1. Open **HACS** in Home Assistant.
2. Click the three dots in the top right corner and select **Custom repositories**.
3. Paste the URL of this GitHub repository and select **Dashboard** as the category.
4. Click **Download** on **Zenit Singularity Card**.

### Option 2: Manual Installation
1. Download `zenit-card.js` and copy it into your `/config/www/` directory.
2. Go to **Settings -> Dashboards -> three dots (top right) -> Resources**.
3. Add `/local/zenit-card.js` as a **JavaScript Module**.

---

## 🛠️ Configuration & Visual Overrides

### Main YAML Options

| Key | Type | Default | Description |
|---|---|---|---|
| `type` | `string` | **Required** | Must be `custom:zenit-card` |
| `entity` | `string` | `""` | Primary entity ID for `[[state]]`, `[[val]]`, `[[icon]]`, and `[[attr:...]]` |
| `entities` | `list` | `[]` | Optional list of additional entity IDs to force-track |
| `template` | `string` | `""` | HTML template with inline variables and JS blocks |
| `style` | `string` | `""` | Custom CSS injected directly into the card's Shadow DOM |
| `lang` | `string` | Auto (HA UI) | Language code for `data-speak` TTS (e.g., `en-US`, `de-DE`, `hu-HU`) |
| `overrides` | `object` | `{}` | Visual theme, border, glow, and background controls (see below) |
| `cards` | `list` | `[]` | List of nested Lovelace cards to inject into `#slot-0`, `#slot-1`, etc. |

### 🎨 Border, Glow & Background Options (`overrides:`)

By default, every card renders with a signature neon pink border and outer glow. You can customize or completely disable the border and background under the `overrides:` key:

| Override Key | Default | Description |
|---|---|---|
| `border` | `true` | Set to `false` to completely remove the card border and neon glow |
| `neon_color` | `"#E64A9C"` | Hex/RGB color of the border. Set to `"none"` or `"transparent"` for borderless mode |
| `neon_glow` | `"0 0 15px rgba(230,74,156,0.5)"` | CSS `box-shadow` value. Set to `"none"` to keep the border line without the glow |
| `background` | `"rgba(20, 20, 25, 0.8)"` | Card background color. Set to `"transparent"` or `"none"` for invisible container |
| `padding` | `"16px"` | Inner padding of the card (e.g., `"0px"` for full-bleed nested cards) |
| `font_family` | `"'Orbitron', monospace"` | Custom font family for the card |

### Template Placeholders & Interactive Attributes

* `[[state]]` – State of the primary `entity`.
* `[[val]]` – Numeric (`parseFloat`) value of the primary `entity` (defaults to `0`).
* `[[icon]]` – Icon of the primary `entity`.
* `[[attr:attribute_name]]` – Attribute of the primary `entity`.
* `[[domain.entity]]` or `[[domain.entity:attribute]]` – State or attribute of *any* entity in Home Assistant.
* `[[[ ... ]]]` – Inline JavaScript block. Exposed variables: `states`, `entity`, `hass`, `Math`. Must `return` an HTML/string value.
* `data-click="..."` – Add to any HTML element to execute JS on tap/click (Exposed: `hass`, `states`, `entity`).
* `data-more-info="domain.entity"` – Add to any HTML element to open the native More-Info dialog on **long press (800ms)**.
* `data-speak="Text to speak"` – Triggers browser SpeechSynthesis on tap/click.

---

## 💻 YAML Examples

### 1. Neon Cyberpunk Sensor Card (With Custom Border & Glow)
```yaml
type: custom:zenit-card
entity: sensor.room_temperature
overrides:
  neon_color: "#00fbff"
  neon_glow: "0 0 15px rgba(0, 251, 255, 0.4)"
template: |
  <div style="display:flex; justify-content:space-between; align-items:center;">
    <span>TEMPERATURE</span>
    <span style="font-size: 24px; color: var(--z-pink);">[[val]] °C</span>
  </div>
```

### 2. Clean Borderless Mode (No Border, No Glow)
To turn off the border and glow, simply set `border: false` (or `neon_color: "none"`):
```yaml
type: custom:zenit-card
entity: sensor.humidity
overrides:
  border: false
  background: "rgba(255, 255, 255, 0.05)"
template: |
  <div style="text-align:center;">
    <div style="font-size: 12px; opacity: 0.7;">HUMIDITY</div>
    <div style="font-size: 28px; font-weight: bold;">[[val]]%</div>
  </div>
```

### 3. Interactive Button with Haptics, Inline JS & TTS
```yaml
type: custom:zenit-card
entity: light.studio_led
template: |
  <div data-click="hass.callService('light', 'toggle', {entity_id: entity})"
       data-speak="Studio light toggled"
       data-more-info="light.studio_led"
       style="text-align:center; padding:14px; cursor:pointer; background:rgba(255,255,255,0.05); border-radius:8px;">
    [[[
      return entity.state === 'on' 
        ? '<span style="color:#00ffaa;">⚡ ONLINE (Brightness: ' + (entity.attributes.brightness || 255) + ')</span>' 
        : '<span style="color:#888;">OFFLINE</span>';
    ]]]
  </div>
```

### 4. Nesting Native or Custom Cards (`#slot-0`)
```yaml
type: custom:zenit-card
overrides:
  neon_color: "#E64A9C"
  padding: "8px"
template: |
  <div style="margin-bottom: 8px; font-weight: bold; letter-spacing: 1px;">SYSTEM OVERRIDE</div>
  <div id="slot-0"></div>
cards:
  - type: button
    entity: switch.exhaust_fan
    name: Exhaust Fan
```