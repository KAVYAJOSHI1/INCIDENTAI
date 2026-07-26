/**
 * Tiny zero-dependency router: method + path-param matching, CORS, JSON body parsing.
 */

import { sendJson, parseJsonBody, ApiError } from "./utils/http.js";

export class Router {
  constructor() {
    this.routes = [];
  }

  #register(method, path, handler) {
    const keys = [];
    const pattern = path.replace(/:[^/]+/g, (segment) => {
      keys.push(segment.slice(1));
      return "([^/]+)";
    });
    this.routes.push({ method, regex: new RegExp(`^${pattern}$`), keys, handler });
  }

  get(path, handler) { this.#register("GET", path, handler); }
  post(path, handler) { this.#register("POST", path, handler); }
  patch(path, handler) { this.#register("PATCH", path, handler); }
  delete(path, handler) { this.#register("DELETE", path, handler); }

  async handle(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    const route = this.routes.find((r) => r.method === req.method && r.regex.test(pathname));
    if (!route) {
      sendJson(res, 404, { error: `Not found: ${req.method} ${pathname}` });
      return;
    }

    const match = pathname.match(route.regex);
    const params = {};
    route.keys.forEach((key, i) => { params[key] = match[i + 1]; });
    const query = Object.fromEntries(parsedUrl.searchParams);

    try {
      const body = ["POST", "PATCH", "PUT"].includes(req.method) ? await parseJsonBody(req) : undefined;
      await route.handler({ req, res, params, query, body });
    } catch (err) {
      const status = err instanceof ApiError ? err.statusCode : 500;
      sendJson(res, status, { error: err.message || "Internal Server Error" });
    }
  }
}
