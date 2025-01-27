/** @type {import('tailwindcss').Config} */
import { skeleton } from '@skeletonlabs/tw-plugin';
import typography from '@tailwindcss/typography';
import daisyui from 'daisyui';
import { color } from 'storybook/internal/theming';
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        primary: '#5755FE',
        secondary: '#FF71CD',
      },
      fontFamily: {
        qs: ["Quicksand", "sans-serif"],
      },
    },
  },
  darkMode: 'class', // Use 'class' to switch themes by adding a class to the root element
  plugins: [
    daisyui,
    skeleton({
      themes: { preset: ["gold-nouveau"] },
    }),
    typography,
  ],
};
