// Tailwind v4 uses CSS-based config via @theme in globals.css
// This file is kept for IDE autocomplete compatibility only
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
}

export default config
