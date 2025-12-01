
const mediaPipeScripts = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js",
];

const scriptLoaderState = {
  loaded: false,
  loading: false,
  promise: null,
};

export function loadMediaPipeScripts() {
  if (scriptLoaderState.loaded) return Promise.resolve();
  if (scriptLoaderState.loading) return scriptLoaderState.promise;

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });

  scriptLoaderState.loading = true;
  scriptLoaderState.promise = Promise.all(mediaPipeScripts.map(loadScript))
    .then(() => {
      scriptLoaderState.loaded = true;
      scriptLoaderState.loading = false;
    })
    .catch((error) => {
      scriptLoaderState.loading = false;
      scriptLoaderState.promise = null;
      throw error;
    });
  return scriptLoaderState.promise;
}
