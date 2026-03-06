const config = {
  // Vite exposes env variables via import.meta.env
  // For production deployment, set VITE_API_URL environment variable
  // If not set, it will use localhost:3000 for development
  API_URL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? "" : "http://localhost:3000"),
};

export default config;
