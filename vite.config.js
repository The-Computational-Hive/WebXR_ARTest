import basicSsl from "@vitejs/plugin-basic-ssl";

export default {
  plugins: [basicSsl()],
  server: {
    https: true,
    host: true, // exposes on local network (0.0.0.0)
  },
};
