# FAB Radial Burst - Visual Guide

## Animation Flow

```
CLOSED STATE:
┌─────────────────────┐
│                     │
│                     │
│                     │
│                     │
│               [🌾]  │  ← Main FAB (agriculture icon)
│                     │     Bottom-right corner
└─────────────────────┘


OPEN STATE (Radial Burst):
┌─────────────────────┐
│                     │
│            [📊]     │  ← Sub-button 1 (234°)
│                     │     Timeline icon
│       [📱]          │  ← Sub-button 2 (198°)
│                     │     Devices icon
│          [🌾]       │  ← Main FAB (center)
│                     │     Agriculture icon
│   [⚙️]              │  ← Sub-button 3 (162°)
│                     │     Settings Remote icon
│      [📡]           │  ← Sub-button 4 (126°)
│                     │     Sensors icon
│           [🌱]      │  ← Sub-button 5 (90°)
│                     │     Grass/Crops icon
└─────────────────────┘
```

## Circular Pattern (Top View)

```
                    [📊] Sub-1
                   /  234°
                  /
                 /
        [📱]────/          110px radius
        198°   /
              /
            [🌾]  ← Main FAB
              \
               \
          126° \────[📡] Sub-4
                 \
                  \
                   \  162°
                   [⚙️] Sub-3
                      
                      [🌱] Sub-5 (90°)
```

## Animation Timeline

```
Time: 0ms      → User clicks main FAB
Time: 0ms      → Backdrop fades in (0.3s transition)
Time: 0ms      → Main FAB scales down to 0.9x
Time: 50ms     → Sub-button 1 bursts out (0.5s animation)
Time: 100ms    → Sub-button 2 bursts out (0.5s animation)
Time: 150ms    → Sub-button 3 bursts out (0.5s animation)
Time: 200ms    → Sub-button 4 bursts out (0.5s animation)
Time: 250ms    → Sub-button 5 bursts out (0.5s animation)
Time: 500ms    → All animations complete
```

## Button States

### Main FAB States:
```
IDLE:
  • Breathing animation (3s cycle)
  • Scale: 1.0 → 1.05 → 1.0
  • Shadow: soft green glow

HOVER:
  • Scale: 1.1x
  • Shadow: stronger green glow
  • No rotation (saves for active state)

ACTIVE:
  • Scale: 0.9x
  • Rotation: 180°
  • Darker green gradient
  • Sub-buttons visible
```

### Sub-button States:
```
INACTIVE:
  • Opacity: 0
  • Transform: translate(0, 0) scale(0)
  • Position: Center of main FAB

ACTIVE:
  • Opacity: 1
  • Transform: translate(var(--x), var(--y)) scale(1)
  • Cascading delay for "blossoming" effect

HOVER:
  • Scale: 1.15x
  • Stronger shadow
  • Maintains position
```

## CSS Custom Properties Usage

Each sub-button uses:
```scss
.fab-sub-1 {
  --angle: 234deg;        // Position angle
  --distance: 110px;      // Distance from center
  --x: calc(cos(var(--angle)) * var(--distance));
  --y: calc(sin(var(--angle)) * var(--distance));
}
```

## Responsive Breakpoints

```
Desktop (> 768px):
  FAB Position: bottom: 2rem, right: 2rem
  FAB Size: 70x70px
  Sub Size: 50x50px
  Distance: 110px
  
Tablet (768px - 480px):
  FAB Position: bottom: 1.5rem, right: 50% (centered)
  FAB Size: 60x60px
  Sub Size: 45x45px
  Distance: 85px
  
Mobile (< 480px):
  FAB Position: bottom: 1rem, right: 50% (centered)
  FAB Size: 56x56px
  Sub Size: 42x42px
  Distance: 75px
```

## Z-Index Hierarchy

```
Layer 5: FAB Main (1002) ← Top-most, always clickable
Layer 4: FAB Sub-buttons (1001)
Layer 3: FAB Container (1001)
Layer 2: FAB Backdrop (999) ← Covers everything below
Layer 1: Footer (900)
Layer 0: Page Content (default)
```

## Color Gradients

### Main FAB:
```scss
background: linear-gradient(135deg, #2E7D32, #4CAF50);
// Dark Green → Medium Green
```

### Sub-buttons:
```scss
Sub-1: linear-gradient(135deg, #1E88E5, #42A5F5);  // Blue
Sub-2: linear-gradient(135deg, #43A047, #66BB6A);  // Green
Sub-3: linear-gradient(135deg, #FB8C00, #FFA726);  // Orange
Sub-4: linear-gradient(135deg, #8E24AA, #AB47BC);  // Purple
Sub-5: linear-gradient(135deg, #00897B, #26A69A);  // Teal
```

## Footer Structure

```
┌─────────────────────────────────────────────────────────┐
│ 🌿 [Decorative leaves floating in background]        🌿 │
├─────────────────────────────────────────────────────────┤
│  [🌾] Smart Farm    │  [●] System Online  │  [✓] v1.0.0 │
│  © 2025 SFMS        │                     │  [📄][💬][⚙]│
└─────────────────────────────────────────────────────────┘
  Left Section          Center Section       Right Section
```

### Footer Sections:
```
LEFT:
  • Agriculture icon
  • Brand name "Smart Farm"
  • Copyright text

CENTER:
  • Status indicator (pulsing dot)
  • "System Online" text

RIGHT:
  • Version badge with verified icon
  • Quick links (Documentation, Support, Settings)
```

## Animation Easing

```scss
// Main FAB
transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
// Smooth acceleration and deceleration

// Sub-buttons
transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
// Elastic "bounce" effect for blossoming
```

## Interaction Flow

```
1. User sees breathing FAB in corner
   ↓
2. User clicks FAB
   ↓
3. Backdrop fades in with blur
   ↓
4. Main FAB shrinks and rotates 180°
   ↓
5. Sub-buttons burst out in sequence
   ↓
6. User hovers over sub-button (scales up)
   ↓
7. User clicks sub-button
   ↓
8. Navigation occurs
   ↓
9. FAB closes automatically
   ↓
10. Backdrop fades out
```

## Mobile Considerations

### Touch Targets:
- Minimum 44x44px (iOS guideline)
- Our mobile FAB: 56x56px ✅
- Our mobile sub-buttons: 42x42px (acceptable with spacing)

### Position:
- Desktop: Right corner (thumb-friendly on mouse)
- Mobile: Bottom-center (thumb-friendly on both hands)

### Spacing:
- Distance reduces from 110px → 85px → 75px
- Prevents sub-buttons from going off-screen

## Accessibility Features

```
✓ ARIA labels on all buttons
✓ Tooltips for context
✓ High contrast colors (WCAG AA compliant)
✓ Focus-visible styles
✓ Keyboard navigation support
✓ Screen reader friendly
```

## Browser Compatibility

```scss
// Backdrop filter with fallback
-webkit-backdrop-filter: blur(4px);  // Safari 9+
backdrop-filter: blur(4px);          // Modern browsers
```

---

**Pro Tip**: The radial burst creates a "blossoming flower" effect, perfectly aligned with the agricultural theme! 🌸🌾

