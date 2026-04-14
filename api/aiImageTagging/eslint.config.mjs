import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module", 
      globals: {
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "off", // 👈 clave para Node legacy style
      "no-console": "off",
    },
  },
];