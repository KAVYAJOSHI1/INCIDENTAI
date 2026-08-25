import http from "node:http";

const server = http.createServer((req, res) => {
  const options = {
    hostname: "127.0.0.1",
    port: 3000,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: "127.0.0.1:3000" }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Proxy connection failed: " + err.message }));
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(3001, () => {
  console.log("Port 3001 forwarder active -> http://127.0.0.1:3000");
});
