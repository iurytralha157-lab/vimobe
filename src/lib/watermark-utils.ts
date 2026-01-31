/**
 * Utility functions for applying watermarks to images
 */

/**
 * Load an image from URL and return as HTMLImageElement
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Download an image with watermark applied using Canvas API
 */
export async function downloadWithWatermark(
  imageUrl: string,
  watermarkUrl: string,
  opacity: number,
  filename: string
): Promise<void> {
  try {
    // Load both images
    const [image, watermark] = await Promise.all([
      loadImage(imageUrl),
      loadImage(watermarkUrl),
    ]);

    // Create canvas with image dimensions
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;

    // Draw the main image
    ctx.drawImage(image, 0, 0);

    // Calculate watermark dimensions (max 10% of image height)
    const maxWatermarkHeight = image.height * 0.1;
    const watermarkHeight = Math.min(watermark.height, maxWatermarkHeight);
    const watermarkWidth = (watermark.width / watermark.height) * watermarkHeight;

    // Position: bottom right with padding
    const padding = Math.min(image.width, image.height) * 0.03;
    const x = image.width - watermarkWidth - padding;
    const y = image.height - watermarkHeight - padding;

    // Apply opacity and draw watermark
    ctx.globalAlpha = opacity / 100;
    ctx.drawImage(watermark, x, y, watermarkWidth, watermarkHeight);

    // Convert to blob and download
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      'image/jpeg',
      0.92
    );
  } catch (error) {
    console.error('Error downloading image with watermark:', error);
    // Fallback: download without watermark
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
