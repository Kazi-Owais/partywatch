import axios, { AxiosRequestConfig } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import { HttpsProxyAgent } from "https-proxy-agent";

const BASE_URL = "https://9anime.org.lv";

// Optional: set your proxy URL here (can be free or paid)
const PROXY_URL = process.env.PROXY_URL || "";

const jar = new CookieJar();

interface CustomAxiosConfig extends AxiosRequestConfig {
  jar: CookieJar;
  httpsAgent?: HttpsProxyAgent<string>;
}

const defaultConfig: CustomAxiosConfig = {
  baseURL: BASE_URL,
  jar,
  withCredentials: true,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    Referer: BASE_URL,
  },
};

// Add proxy agent if provided
if (PROXY_URL) {
  defaultConfig.httpsAgent = new HttpsProxyAgent(PROXY_URL);
}

const client = wrapper(axios.create(defaultConfig));

export default client;
