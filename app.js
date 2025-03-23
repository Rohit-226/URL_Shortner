import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";
import { json } from "stream/consumers";
import { link } from "fs";

const PORT = 5000;
const DATA_FILE = path.join("data", "links.json");

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

const loadlinks = async () => {
    try{
        const data = await readFile(DATA_FILE, "utf-8");
        return JSON.parse(data) || {};
    }
    catch (error){
        if(error.code === "ENOENT"){ //error no entry ENOENT
            await writeFile(DATA_FILE, JSON.stringify({}, null, 2));
            return {};
        }
        console.error("Error loading links:", error);
        return {}; // Prevent crashing
    }
} 

const saveLinks = async (links) => {
    try {
        await writeFile(DATA_FILE, JSON.stringify(links, null, 2));
        console.log("✅ Links saved successfully!", links);
    } catch (error) {
        console.error("❌ Error saving links:", error);
    }
};


const server = createServer(async (req, res) => {
    console.log(req.method, req.url);

    if (req.method === "GET") {
        if (req.url === "/") {
            return serveFile(res, path.join("public", "index.html"), "text/html");
        } else if (req.url === "/style.css") {
            return serveFile(res, path.join("public", "style.css"), "text/css");
        } else if(req.url === "/links"){
            const links = await loadlinks();
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify(links));
        } else{
            const links = await loadlinks();
            const shortCode = req.url.slice(1);
            console.log("links red. ", req.url);
            if(links[shortCode]){
                res.writeHead(302, {location: links[shortCode]});
                return res.end();
            }
            res.writeHead(404, {"Content-Type": "text/plain"});
            return res.end("Shortened URL is required");
        }
    }

    if(req.method === "POST" && req.url === "/shorten"){
        const links = await loadlinks();
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async() => {
            console.log(body);
            const {url, shortCode} = JSON.parse(body);
        
            if(!url){
                res.writeHead(400, { "Content-Type": "text/plain" });
                return res.end("URL is required");
            }
        
            const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex");
        
            if(links[finalShortCode]){
                res.writeHead(400, { "Content-Type": "text/plain" });
                return res.end("Short code already exists. Please choose another");
            }
    
            links[finalShortCode] = url;
        
            await saveLinks(links);
        
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({success:true, shortCode: finalShortCode }));
        });
    }
});


server.listen(PORT, async () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    const links = await loadlinks();
    console.log("📂 Loaded links:", links);
});








// import { createServer } from "http";
// import { readFile } from "fs/promises";
// import path, { dirname } from "path";
// import { fileURLToPath } from "url";

// const __dirname = dirname(fileURLToPath(import.meta.url));
// const PORT = 5000;

// const server = createServer(async (req, res) => {
//     console.log(`Incoming request: ${req.method} ${req.url}`);

//     if (req.method === "GET") {
//         if (req.url === "/") {
//             try {
//                 const filePath = path.join(__dirname, "public", "index.html");
//                 console.log(`Serving file: ${filePath}`);

//                 const data = await readFile(filePath, "utf-8");
//                 res.writeHead(200, { "Content-Type": "text/html" });
//                 res.end(data);
//             } catch (error) {
//                 console.error("Error reading file:", error);
//                 res.writeHead(404, { "Content-Type": "text/html" });
//                 res.end("404 Page Not Found");
//             }
//         }
//         else if (req.url === "/style.css") {
//             try {
//                 const filePath = path.join(__dirname, "public", "style.css");
//                 console.log(`Serving file: ${filePath}`);

//                 const data = await readFile(filePath, "utf-8");
//                 res.writeHead(200, { "Content-Type": "text/css" });
//                 res.end(data);
//             } catch (error) {
//                 console.error("Error reading file:", error);
//                 res.writeHead(404, { "Content-Type": "text/css" });
//                 res.end("404 Page Not Found");
//             }
//         }
//     }
// });

// server.listen(PORT, () => {
//     console.log(`Server running at http://localhost:${PORT}`);
// });
