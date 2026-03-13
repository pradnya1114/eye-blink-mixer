import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;
let initPromise: Promise<FaceLandmarker> | null = null;
let lastVideoTime = -1;

export type BlinkResult = 
  | { status: 'ok'; leftOpen: number; rightOpen: number }
  | { status: 'no-face' }
  | { status: 'skipped' } // Video frame hasn't changed
  | { status: 'loading' }; // Model not ready

export async function initializeFaceLandmarker() {
  if (faceLandmarker) return faceLandmarker;
  if (initPromise) return initPromise;

  console.log("Initializing FaceLandmarker...");

  initPromise = (async () => {
    try {
      // Patch console methods to suppress specific TFLite messages
      const originalInfo = console.info;
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;
      
      const shouldFilter = (args: any[]) => {
        const msg = args.map(a => String(a)).join(' ');
        return msg.includes('Created TensorFlow Lite XNNPACK delegate for CPU') || 
               msg.includes('TensorFlow Lite') ||
               msg.includes('XNNPACK');
      };

      console.info = (...args) => {
        if (!shouldFilter(args)) originalInfo.apply(console, args);
      };
      
      console.log = (...args) => {
        if (!shouldFilter(args)) originalLog.apply(console, args);
      };

      console.warn = (...args) => {
        if (!shouldFilter(args)) originalWarn.apply(console, args);
      };

      console.error = (...args) => {
        // Only filter if it's the specific TFLite info message being mis-logged as error
        if (!shouldFilter(args)) originalError.apply(console, args);
      };

      // Use a newer, stable WASM version matching package.json
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
      );

      faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU" // Prefer GPU for performance
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1,
      });

      // We keep the suppression active for a bit longer or permanently if needed, 
      // but usually initialization is where it happens most.
      // For now, let's restore after a short delay to catch async logs.
      setTimeout(() => {
        console.info = originalInfo;
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
      }, 5000);

      console.log("FaceLandmarker initialized successfully!");
      return faceLandmarker;
    } catch (e) {
      console.error("Failed to initialize FaceLandmarker:", e);
      throw e;
    }
  })();

  return initPromise;
}

export function detectBlink(video: HTMLVideoElement): BlinkResult {
  // Safety checks
  if (!faceLandmarker) return { status: 'loading' };
  if (!video || !video.videoWidth || !video.videoHeight) return { status: 'skipped' };
  if (video.paused || video.ended) return { status: 'skipped' };

  try {
    const nowInMs = Date.now();
    
    // Only process if video time has advanced
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      
      const results = faceLandmarker.detectForVideo(video, nowInMs);
      
      if (results.faceBlendshapes && results.faceBlendshapes.length > 0 && results.faceBlendshapes[0].categories) {
        const categories = results.faceBlendshapes[0].categories;
        
        // Extract blink scores (0 = open, 1 = closed)
        const leftBlink = categories.find(c => c.categoryName === 'eyeBlinkLeft')?.score || 0;
        const rightBlink = categories.find(c => c.categoryName === 'eyeBlinkRight')?.score || 0;
        
        return {
          status: 'ok',
          leftOpen: 1 - leftBlink,
          rightOpen: 1 - rightBlink
        };
      } else {
        return { status: 'no-face' };
      }
    }
    
    return { status: 'skipped' };
  } catch (error) {
    console.error("Error during detection:", error);
    return { status: 'no-face' };
  }
}