import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import process from "node:process";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/Image-Sharing-APP/",
  plugins: [react()],
});
