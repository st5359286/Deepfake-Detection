const config = {
  // Vite exposes env variables via import.meta.env
  // If running in development (npm run dev), it uses localhost:3000
  // If built and deployed, it uses the VITE_API_URL env variable, or falls back to 'slash-api' relative path if serving from same origin
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000'
};

export default config;
