const API_URL = (process.env.EVOLUTION_GO_API_URL || "").replace(/\/+$/, "");
const API_KEY = process.env.EVOLUTION_GO_API_KEY || "";
const INSTANCE_ID = "3ede1e3f-540b-4db7-a543-9a4e05c454f6";
const INSTANCE_NAME = "teste_cd868_ylf";
const INSTANCE_TOKEN = "default_token";

async function test(name: string, headers: any) {
  console.log(`--- Testing: ${name} ---`);
  try {
    const res = await fetch(`${API_URL}/instance/status`, { headers });
    const text = await res.text();
    console.log(`Status: ${res.status}`, text);
  } catch (e) {
    console.error(`Error: ${e.message}`);
  }
}

await test("Global API Key + instanceId header", {
  "apikey": API_KEY,
  "instanceId": INSTANCE_ID
});

await test("Global API Key + instance header (ID)", {
  "apikey": API_KEY,
  "instance": INSTANCE_ID
});

await test("Global API Key + instance header (NAME)", {
  "apikey": API_KEY,
  "instance": INSTANCE_NAME
});

await test("Instance Token as apikey + instanceId header", {
  "apikey": INSTANCE_TOKEN,
  "instanceId": INSTANCE_ID
});

await test("Instance Token as apikey (no instance header)", {
  "apikey": INSTANCE_TOKEN
});

await test("Authorization: Bearer GlobalKey + instanceId", {
  "Authorization": `Bearer ${API_KEY}`,
  "instanceId": INSTANCE_ID
});

await test("Path-based? /instance/status/${INSTANCE_NAME}", {
  "apikey": API_KEY
});

// Try path-based status
try {
  console.log("--- Testing: Path-based /instance/status/NAME ---");
  const res = await fetch(`${API_URL}/instance/status/${INSTANCE_NAME}`, {
    headers: { "apikey": API_KEY }
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`, text);
} catch (e) {}

try {
  console.log("--- Testing: Path-based /instance/status/ID ---");
  const res = await fetch(`${API_URL}/instance/status/${INSTANCE_ID}`, {
    headers: { "apikey": API_KEY }
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`, text);
} catch (e) {}

