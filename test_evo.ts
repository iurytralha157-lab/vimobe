const API_URL = (process.env.EVOLUTION_GO_API_URL || "").replace(/\/+$/, "");
const API_KEY = process.env.EVOLUTION_GO_API_KEY || "";
const INSTANCE_ID = "3ede1e3f-540b-4db7-a543-9a4e05c454f6";

async function test(headerName: string) {
  console.log(`Testing header: ${headerName}`);
  const headers = {
    "apikey": API_KEY,
    "Content-Type": "application/json"
  };
  (headers as any)[headerName] = INSTANCE_ID;

  try {
    const res = await fetch(`${API_URL}/instance/status`, { headers });
    const text = await res.text();
    console.log(`Status: ${res.status}`, text);
  } catch (e) {
    console.error(`Error: ${e.message}`);
  }
}

async function testAll() {
  console.log("Testing /instance/all");
  try {
    const res = await fetch(`${API_URL}/instance/all`, {
      headers: { "apikey": API_KEY }
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`, text);
  } catch (e) {
    console.error(`Error: ${e.message}`);
  }
}

console.log(`API_URL: ${API_URL}`);
// console.log(`API_KEY length: ${API_KEY.length}`);

await testAll();
await test("instanceId");
await test("instance");
await test("InstanceId");
