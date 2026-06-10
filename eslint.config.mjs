import next from "eslint-config-next";

const config = [
  ...next,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off"
    }
  }
];

export default config;
