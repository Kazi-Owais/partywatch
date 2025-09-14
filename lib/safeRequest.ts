import client from "./axiosClient";
import axios, { AxiosRequestConfig } from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

export async function safeGet(url: string, config: AxiosRequestConfig = {}) {
  try {
    const res = await client.get(url, config);
    return res.data;
  } catch (err: unknown) {
    console.error("Direct request failed:", err instanceof Error ? err.message : String(err));

    // If proxy is available, retry with axios + proxy
    if (process.env.PROXY_URL) {
      console.log("Retrying with proxy...");
      try {
        const res = await axios.get(url, {
          ...config,
          httpsAgent: new HttpsProxyAgent(process.env.PROXY_URL!),
          headers: {
            ...config.headers,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
          },
        });
        return res.data;
      } catch (proxyErr: unknown) {
        console.error("Proxy request failed:", proxyErr instanceof Error ? proxyErr.message : String(proxyErr));
        throw proxyErr;
      }
    }

    throw err;
  }
}
