/**
 * Formats image URLs with Cloudinary dynamic parameters (w, h, c_fill, f_auto, q_auto) for optimized thumbnail delivery.
 */
export function formatThumbnailUrl(url, width = 300, height = 300) {
  if (!url || typeof url !== 'string') return '/logo.jpg';
  
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    // Inject w_300,h_300,c_fill,f_auto,q_auto parameter transformation right after /upload/
    const params = `w_${width},h_${height},c_fill,f_auto,q_auto`;
    return url.replace('/upload/', `/upload/${params}/`);
  }
  
  return url;
}
