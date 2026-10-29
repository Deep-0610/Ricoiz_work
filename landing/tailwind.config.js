const config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0F766E", // teal-700
          light: "#14B8A6",
          dark: "#134E4A",
        },
      },
    },
  },
  plugins: [],
};
module.exports = config;
