# Vite + React + TypeScript Template

A clean, production-ready template for building React applications with TypeScript, Vite, and Tailwind CSS v4.

## 🚀 Quick Start

### 1. Copy this template to a new project:

```bash
cp -r _vite-react-ts-template my-new-project
cd my-new-project
```

### 2. Install dependencies:

```bash
npm install
```

### 3. Start development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 📦 What's Included

- **Vite 8+** - Lightning-fast build tool
- **React 19** - Latest React with automatic JSX transform
- **TypeScript 5.6** - Full type safety
- **Tailwind CSS v4** - Modern utility-first CSS with `@import` syntax
- **PostCSS** - CSS processing
- **ESM modules** - Modern JavaScript modules

## 📁 Project Structure

```
.
├── index.html          # Entry HTML file
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── postcss.config.js   # PostCSS configuration
├── package.json        # Dependencies and scripts
└── src/
    ├── main.tsx        # React entry point
    ├── App.tsx         # Root component
    ├── index.css       # Global styles with Tailwind
    └── vite-env.d.ts   # Vite and CSS type declarations
```

## 🔧 Configuration Files Explained

### `vite.config.ts`

- Uses the React plugin for HMR (Hot Module Replacement)
- Auto-optimizes dependencies for faster development

### `tsconfig.json`

- Target: ES2020 for modern browsers
- Module: ESNext for Vite
- `moduleResolution: "bundler"` for optimal Vite support
- `allowImportingTsExtensions` implicitly enabled via bundler resolution

### `postcss.config.js`

- Uses `@tailwindcss/postcss` (Tailwind CSS v4 plugin)
- Processes CSS automatically during development

### `tailwind.config.js`

- Scans `src/**/*.{js,ts,jsx,tsx}` for class names
- Extend theme as needed for your project

## 📝 Tailwind CSS v4 Usage

Use the new `@import "tailwindcss"` syntax in your CSS:

```css
@import "tailwindcss";

/* Your custom styles */
body {
  font-family: system-ui;
}
```

No need for `@tailwind base/components/utilities` anymore!

## 🎨 Adding Components

Create new components in `src/`:

```tsx
// src/components/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export default function Button({ children, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      {children}
    </button>
  );
}
```

## 📦 Adding Dependencies

```bash
# Add React libraries
npm install react-router-dom axios zustand

# Add TypeScript types
npm install -D @types/node
```

## 🏗️ Building for Production

```bash
npm run build
```

Output will be in the `dist/` folder, ready for deployment.

## 🔍 Type Safety

- All files use `.tsx` for components and `.ts` for utilities
- TypeScript strict mode is enabled by default (recommended)
- CSS imports are properly typed via `vite-env.d.ts`

## ⚡ Performance Tips

1. **Code Splitting**: Vite automatically chunks code
2. **Tree Shaking**: Unused code is removed automatically
3. **CSS Purging**: Tailwind only includes used classes
4. **Source Maps**: Disabled in production for smaller bundles

## 🚨 Common Issues & Solutions

### "Cannot find module '\*.css'"

- Make sure `vite-env.d.ts` exists in `src/`
- Restart TypeScript server in VS Code (Ctrl+Shift+P → "TypeScript: Restart TS Server")

### Tailwind styles not applied

- Ensure `tailwind.config.js` has correct `content` paths
- Check that `postcss.config.js` is configured properly
- Run `npm install` after template setup

### Port 5173 in use

- Vite will automatically use port 5174+ if 5173 is taken
- Or specify: `npm run dev -- --port 3000`

## 📚 Learn More

- [Vite Docs](https://vitejs.dev/)
- [React Docs](https://react.dev/)
- [TypeScript Docs](https://www.typescriptlang.org/)
- [Tailwind CSS v4 Migration](https://tailwindcss.com/docs/v4-upgrade-guide)

## 📄 License

MIT - Feel free to use this template for any project!
