import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    extend: {
      tokens: {
        colors: {
          sberGreen: { value: '#21a038' },
          sberGreenHover: { value: '#1b8a2e' },
          secondaryText: { value: '#6e6e73' }
        }
      },
      breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px'
      }
    },
  },

  // Настройка глобального контейнера
  patterns: {
    extend: {
      container: {
        transform(props: any) {
          return {
            position: 'relative',
            width: '100%',
            maxWidth: '512px',
            mx: 'auto',
            px: '20px',
            ...props
          }
        }
      }
    }
  },

  // The output directory for your css system
  outdir: "styled-system",
  jsxFramework: "react"
});
