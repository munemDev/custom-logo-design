import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const deployId = process.argv[2] || "6af354cbaebdbaf0a10490b9";

// Read token from Netlify CLI config
const cfgPath = path.join(
  process.env.APPDATA || "",
  "netlify",
  "Config",
  "config.json",
);
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
let token = null;
if (cfg.users) {
  for (const u of Object.values(cfg.users)) {
    if (u?.auth?.token) {
      token = u.auth.token;
      break;
    }
  }
}
if (!token) {
  console.error("No Netlify token found");
  process.exit(1);
}

const site = "58ba4e10-8a06-46a7-80c9-0e34b053b49a";
const url = `https://api.netlify.com/api/v1/sites/${site}/deploys/${deployId}/restore`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});
const text = await res.text();
console.log(res.status, text.slice(0, 500));
process.exit(res.ok ? 0 : 1);
