import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { ember: '#e11d48', midnight: '#05030a' } } }, plugins: [] } satisfies Config;
