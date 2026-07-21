import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";

const augmentationWorker = process.env.AUGMENTATION_EXPORT_WORKER_URL ?? "http://127.0.0.1:5098";

export default defineConfig({
  output: "static",
  integrations: [preact()],
  prefetch: true,
  vite: {
    ssr: {
      external: ["@astrojs/preact"],
    },
    server: {
      proxy: {
        "/api/augmentation": {
          target: augmentationWorker,
          changeOrigin: true,
        },
      },
    },
  },
});
