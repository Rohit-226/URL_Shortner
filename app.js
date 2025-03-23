import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5000;
const DATA_FILE = path.join(__dirname, "data", "links.json"); // ✅ Fix: Absolute Path

const serveFile = async (res, filePath, contentType) => {
    try {
        const data = await readFile(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
    } catch (error) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 page not found");
    }
};

const loadLinks = async () => {
    try {
        const data = await readFile(DATA_FILE, "utf-8");
        return JSON.parse(data) || {};
    } catch (error) {
        if (error.code === "ENOENT") {
            await writeFile(DATA_FILE, JSON.stringify({}, null, 2));
            return {};
        }
        console.error("❌ Error loading links:", error);
        return {}; 
    }
};

const saveLinks = async (links) => {
    try {
        await writeFile(DATA_FILE, JSON.stringify(links, null, 2));
        console.log("✅ Links saved successfully!");
    } catch (error) {
        console.error("❌ Error saving links:", error);
    }
};

const server = createServer(async (req, res) => {
    console.log(req.method, req.url);

    // ✅ Fix: Ignore HEAD requests (common in hosting platforms)
    if (req.method === "HEAD") {
        res.writeHead(200);
        return res.end();
    }

    if (req.method === "GET") {
        if (req.url === "/") {
            return serveFile(res, path.join(__dirname, "public", "index.html"), "text/html");
        } else if (req.url === "/style.css") {
            return serveFile(res, path.join(__dirname, "public", "style.css"), "text/css");
        } else if (req.url === "/links") {
            const links = await loadLinks();
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify(links));
        } else {
            const links = await loadLinks();
            const shortCode = req.url.slice(1);
            if (links[shortCode]) {
                res.writeHead(302, { Location: links[shortCode] });
                return res.end();
            }
            res.writeHead(404, { "Content-Type": "text/plain" });
            return res.end("Shortened URL not found");
        }
    }

    if (req.method === "POST" && req.url === "/shorten") {
        const links = await loadLinks();
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
            try {
                const { url, shortCode } = JSON.parse(body);

                if (!url) {
                    res.writeHead(400, { "Content-Type": "text/plain" });
                    return res.end("URL is required");
                }

                const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex");

                if (links[finalShortCode]) {
                    res.writeHead(400, { "Content-Type": "text/plain" });
                    return res.end("Short code already exists. Please choose another");
                }

                links[finalShortCode] = url;
                await saveLinks(links);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true, shortCode: finalShortCode }));
            } catch (error) {
                console.error("❌ Error processing request:", error);
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.end("Internal Server Error");
            }
        });
    }
});

server.listen(PORT, "0.0.0.0", async () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    const links = await loadLinks();
    console.log("📂 Loaded links:", links);
});
