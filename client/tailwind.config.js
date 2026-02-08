/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#1877F2", // Facebook Blue-ish
                secondary: "#42b72a",
                dark: "#1c1e21",
                light: "#f0f2f5"
            }
        },
    },
    plugins: [],
}
