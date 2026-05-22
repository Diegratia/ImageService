require("dotenv").config();

module.exports = {
  PORT: process.env.PORT,
  APP_HOST: process.env.APP_HOST,
  CDN_URL: process.env.CDN_URL,

  get BASE_URL() {
    return `${this.APP_HOST}${this.PORT ? `:${this.PORT}` : ""}`;
  },
};
