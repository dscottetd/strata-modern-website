# Strata Scientific website

The scene copy lives in `PAGE_SCENES` in `src/scenes.ts`. A mouse-wheel or
trackpad gesture moves one scene at a time; touch, keyboard, scene links, and
scrolling in oversized layouts remain native. Scrolling past the final scene
reaches the footer. Changing scenes scatters the decorative glyph particles
before they assemble into the next figure. On mobile, the glyph has a separate
area above the copy. Reduced-motion preferences bypass the particle transition.

`npm run build` prerenders the React app into `dist/index.html` before the
client hydrates it. Each scene's heading, label, and description are present
in its article for search engines and assistive technology; the visible
sticky copy uses the same scene data.
The build also checks that all eight articles contain their current scene copy.
Run `npm run dev` for local development and `npm run lint` to check the code.

## Firebase Hosting deployment

This project is configured for Firebase Hosting. Use these commands when you need
to deploy the production site again.

```bash
# one-time login to Firebase (if needed)
npx firebase-tools login --reauth

# build the production bundle
npm run build

# deploy only the hosting target
after the login completes, run:
npx firebase-tools deploy --only hosting
```

Or via the package script:

```bash
npm run deploy
```

The default Firebase project is `strata-scientific-website` and the hosting
config is in `firebase.json`.

## Vite template information

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
