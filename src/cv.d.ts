// Type declarations for the OpenCV global loaded via public/opencv.js script tag.
// The @techstark/opencv-js package ships matching TypeScript types.
import type * as OpenCVTypes from '@techstark/opencv-js';

declare global {
  /**
   * The OpenCV.js runtime, available globally after public/opencv.js has loaded
   * and `cv.onRuntimeInitialized` has fired.
   */
  const cv: typeof OpenCVTypes;
}
