import { convertFromRgb } from './colorUtils';

export interface ExtractedColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  cmyk: { c: number; m: number; y: number; k: number };
  frequency: number;
  role: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'destructive';
  name: string;
}

interface ColorBucket {
  r: number;
  g: number;
  b: number;
  count: number;
}

// Calculate color distance in RGB space
function colorDistance(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

// Get saturation from RGB
function getSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

// Get luminance from RGB
function getLuminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Check if color is too white/light
function isTooLight(r: number, g: number, b: number): boolean {
  return getLuminance(r, g, b) > 0.9;
}

// Check if color is too dark
function isTooDark(r: number, g: number, b: number): boolean {
  return getLuminance(r, g, b) < 0.1;
}

// Check if color is too gray/unsaturated
function isTooGray(r: number, g: number, b: number): boolean {
  return getSaturation(r, g, b) < 0.1;
}

export async function extractColorsFromImage(file: File): Promise<ExtractedColor[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Resize to 100x100 for performance
        const size = 100;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imageData = ctx.getImageData(0, 0, size, size);
        const pixels = imageData.data;

        // Collect all valid colors
        const colorBuckets: ColorBucket[] = [];
        const threshold = 30; // Color similarity threshold

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

          // Skip extreme colors (too light, dark, or gray)
          if (isTooLight(r, g, b) || isTooDark(r, g, b)) continue;

          // Find similar color bucket or create new one
          let found = false;
          for (const bucket of colorBuckets) {
            if (colorDistance({ r, g, b }, bucket) < threshold) {
              // Average the colors
              bucket.r = Math.round((bucket.r * bucket.count + r) / (bucket.count + 1));
              bucket.g = Math.round((bucket.g * bucket.count + g) / (bucket.count + 1));
              bucket.b = Math.round((bucket.b * bucket.count + b) / (bucket.count + 1));
              bucket.count++;
              found = true;
              break;
            }
          }

          if (!found) {
            colorBuckets.push({ r, g, b, count: 1 });
          }
        }

        // Sort by frequency and saturation
        colorBuckets.sort((a, b) => {
          const satA = getSaturation(a.r, a.g, a.b);
          const satB = getSaturation(b.r, b.g, b.b);
          // Prefer more saturated colors with higher count
          return (b.count * (1 + satB)) - (a.count * (1 + satA));
        });

        // Generate palette
        const palette = generatePaletteFromBuckets(colorBuckets);
        resolve(palette);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

function generatePaletteFromBuckets(buckets: ColorBucket[]): ExtractedColor[] {
  const roles: Array<{ role: ExtractedColor['role']; name: string }> = [
    { role: 'primary', name: 'Primária' },
    { role: 'secondary', name: 'Secundária' },
    { role: 'accent', name: 'Acento' },
    { role: 'success', name: 'Sucesso' },
    { role: 'warning', name: 'Alerta' },
    { role: 'destructive', name: 'Perigo' },
  ];

  const result: ExtractedColor[] = [];
  const usedColors: ColorBucket[] = [];

  // Get primary color (most frequent saturated color)
  const primaryBucket = buckets.find(b => !isTooGray(b.r, b.g, b.b)) || buckets[0];
  if (primaryBucket) {
    usedColors.push(primaryBucket);
    result.push(createExtractedColor(primaryBucket, roles[0], primaryBucket.count));
  }

  // Get secondary color (second most frequent, distinct from primary)
  const secondaryBucket = buckets.find(b => 
    !usedColors.some(u => colorDistance(b, u) < 60) && !isTooGray(b.r, b.g, b.b)
  );
  if (secondaryBucket) {
    usedColors.push(secondaryBucket);
    result.push(createExtractedColor(secondaryBucket, roles[1], secondaryBucket.count));
  } else {
    // Generate a lighter version of primary
    const lightPrimary = primaryBucket ? {
      r: Math.min(255, primaryBucket.r + 100),
      g: Math.min(255, primaryBucket.g + 100),
      b: Math.min(255, primaryBucket.b + 100),
      count: 0
    } : { r: 241, g: 245, b: 249, count: 0 };
    result.push(createExtractedColor(lightPrimary, roles[1], 0));
  }

  // Get accent color (lighter, can be grayish)
  const accentBucket = buckets.find(b => 
    !usedColors.some(u => colorDistance(b, u) < 60) &&
    getLuminance(b.r, b.g, b.b) > 0.5
  );
  if (accentBucket) {
    usedColors.push(accentBucket);
    result.push(createExtractedColor(accentBucket, roles[2], accentBucket.count));
  } else {
    // Generate light blue accent
    result.push(createExtractedColor({ r: 224, g: 242, b: 254 }, roles[2], 0));
  }

  // Success - find greenish color or use default
  const successBucket = buckets.find(b => 
    b.g > b.r && b.g > b.b && !usedColors.some(u => colorDistance(b, u) < 40)
  );
  if (successBucket) {
    result.push(createExtractedColor(successBucket, roles[3], successBucket.count));
  } else {
    result.push(createExtractedColor({ r: 22, g: 163, b: 74 }, roles[3], 0));
  }

  // Warning - find yellowish/orange color or use default
  const warningBucket = buckets.find(b => 
    b.r > b.b && b.g > b.b * 0.8 && !usedColors.some(u => colorDistance(b, u) < 40)
  );
  if (warningBucket) {
    result.push(createExtractedColor(warningBucket, roles[4], warningBucket.count));
  } else {
    result.push(createExtractedColor({ r: 245, g: 158, b: 11 }, roles[4], 0));
  }

  // Destructive - find reddish color or use default
  const destructiveBucket = buckets.find(b => 
    b.r > b.g && b.r > b.b && !usedColors.some(u => colorDistance(b, u) < 40)
  );
  if (destructiveBucket) {
    result.push(createExtractedColor(destructiveBucket, roles[5], destructiveBucket.count));
  } else {
    result.push(createExtractedColor({ r: 239, g: 68, b: 68 }, roles[5], 0));
  }

  return result;
}

function createExtractedColor(
  color: { r: number; g: number; b: number },
  roleInfo: { role: ExtractedColor['role']; name: string },
  frequency: number
): ExtractedColor {
  const formats = convertFromRgb(color.r, color.g, color.b);
  
  return {
    hex: formats.hex,
    rgb: { r: color.r, g: color.g, b: color.b },
    hsl: formats.hsl,
    cmyk: formats.cmyk,
    frequency,
    role: roleInfo.role,
    name: roleInfo.name,
  };
}
