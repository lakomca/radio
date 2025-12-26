# Visual Equalizer Settings Guide

## Current Settings

Located in `public/app.js` around line 4313-4462:

```javascript
const NUM_BARS = 32;                    // Number of frequency bars
analyser.fftSize = 256;                 // FFT size (frequency resolution)
analyser.smoothingTimeConstant = 0.8;   // Smoothing (0.0 = no smoothing, 1.0 = max smoothing)
```

## Adjustable Settings

### 1. Number of Bars (`NUM_BARS`)

**Location**: Line 4321

```javascript
const NUM_BARS = 32; // Change this value
```

**Options**:
- `16` - Fewer bars, less detail
- `32` - Default (balanced)
- `64` - More bars, more detail (may be slower)

### 2. FFT Size (`fftSize`)

**Location**: Line 4329

```javascript
analyser.fftSize = 256; // Change this value
```

**Options** (must be power of 2):
- `128` - Lower resolution, faster
- `256` - Default (balanced)
- `512` - Higher resolution, smoother
- `1024` - Very high resolution (may be slower)

**Effect**: Higher = more frequency detail but more CPU usage

### 3. Smoothing (`smoothingTimeConstant`)

**Location**: Line 4330

```javascript
analyser.smoothingTimeConstant = 0.8; // Change this value (0.0 to 1.0)
```

**Options**:
- `0.0` - No smoothing, instant response (may be jittery)
- `0.3` - Fast response, slight smoothing
- `0.5` - Balanced
- `0.8` - Default (smooth transitions)
- `1.0` - Maximum smoothing (very smooth but laggy)

**Effect**: Higher = smoother but more lag, Lower = faster response but jittery

### 4. Frequency Mapping (Logarithmic vs Linear)

**Location**: Line 4420

**Current (Linear)**:
```javascript
const dataIndex = Math.floor((i / NUM_BARS) * dataArray.length);
```

**Better (Logarithmic)** - More accurate for audio:
```javascript
// Logarithmic mapping (better for audio frequencies)
const dataIndex = Math.floor(
    Math.pow(dataArray.length, i / NUM_BARS)
);
```

Or use this improved version:
```javascript
// Logarithmic mapping with better distribution
const logScale = (index, total, max) => {
    const normalized = index / total;
    return Math.floor(Math.pow(max, normalized));
};
const dataIndex = logScale(i, NUM_BARS, dataArray.length);
```

## Common Sync Issues

### Issue 1: Equalizer Lagging Behind Audio

**Cause**: `smoothingTimeConstant` too high

**Fix**: Reduce smoothing
```javascript
analyser.smoothingTimeConstant = 0.3; // Faster response
```

### Issue 2: Equalizer Too Jittery

**Cause**: `smoothingTimeConstant` too low or `fftSize` too low

**Fix**: Increase smoothing or FFT size
```javascript
analyser.smoothingTimeConstant = 0.8; // More smoothing
analyser.fftSize = 512; // Higher resolution
```

### Issue 3: Not Syncing with Stream Changes

**Cause**: Source not reconnecting when stream URL changes

**Fix**: The code should handle this, but you can force reconnect:
```javascript
// In loadStream function, after setting src:
if (isEqualizerActive) {
    stopEqualizer();
    setTimeout(() => startEqualizer(), 100);
}
```

### Issue 4: Frequency Distribution Not Accurate

**Cause**: Linear mapping instead of logarithmic

**Fix**: Use logarithmic mapping (see above)

## Recommended Settings

### For Better Sync (Less Lag)
```javascript
const NUM_BARS = 32;
analyser.fftSize = 512;
analyser.smoothingTimeConstant = 0.3; // Faster response
```

### For Smoother Visualization
```javascript
const NUM_BARS = 32;
analyser.fftSize = 512;
analyser.smoothingTimeConstant = 0.8; // Smooth transitions
```

### For Best Performance
```javascript
const NUM_BARS = 16;
analyser.fftSize = 256;
analyser.smoothingTimeConstant = 0.5;
```

### For Best Accuracy
```javascript
const NUM_BARS = 64;
analyser.fftSize = 1024;
analyser.smoothingTimeConstant = 0.3;
// Use logarithmic frequency mapping
```

## How to Change Settings

1. **Open** `public/app.js`
2. **Find** the equalizer section (around line 4313)
3. **Modify** the values
4. **Save** and **redeploy** to Firebase:
   ```powershell
   firebase deploy --only hosting
   ```

## Testing Changes

After changing settings:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Reload Firebase site
3. Play a song and observe equalizer
4. Adjust values as needed

## Current Code Location

- **Settings**: Lines 4321, 4329-4330
- **Drawing Logic**: Lines 4395-4462
- **Frequency Mapping**: Line 4420

## Troubleshooting

### Equalizer Not Showing
- Check browser console for errors
- Verify `equalizerCanvas` element exists
- Check `isEqualizerActive` is true

### Equalizer Not Responding
- Check `audioContext` is initialized
- Verify `source` is connected
- Check browser console for Web Audio API errors

### Equalizer Out of Sync
- Reduce `smoothingTimeConstant`
- Increase `fftSize` for better resolution
- Use logarithmic frequency mapping

