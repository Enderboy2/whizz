/** @type {import('tailwindcss').Config} */
import { skeleton } from '@skeletonlabs/tw-plugin';

export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      
      fontFamily: {
        qs: ["Quicksand", "sans-serif"],
      },
    },
  },
  darkMode: 'media', // Use 'class' to switch themes by adding a class to the root element
  plugins: [
    require('daisyui'),
    skeleton({
      themes: { preset: [ "gold-nouveau" ] }
    })
  ],
};
