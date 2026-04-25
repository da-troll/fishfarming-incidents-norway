module.exports = {
  apps: [
    {
      name: "fish-proxy",
      script: "./proxy.js",
      cwd: "/opt/apps/fishfarming-incidents-norway",
      env: {
        NODE_ENV: "production",
        PORT: "3475",
        CLIENT_ID: "trollefsen-fiskehelse-viewer",
      },
      max_memory_restart: "256M",
      autorestart: true,
      restart_delay: 5000,
    },
  ],
};
