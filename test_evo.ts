import { createClient } from "npm:@supabase/supabase-js@2";

const API_URL = (Deno.env.get("EVOLUTION_GO_API_URL") || "").replace(/\/+$/, "");
const API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY") || "";
const INSTANCE_ID = "3ede1e3f-540b-4db7-a543-9a4e05c454f6";

async function test(headerName: string) {
  console.log(`Testing header: ${headerName}`);
  const headers: any = {
    "apikey": API_KEY,
    "Content-Type": "application/json"
  };
  headers[headerName] = INSTANCE_ID;

  const res = await fetch(`${API_URL}/instance/status`, { headers });
  const data = await res.json();
  console.log(`Status: ${res.status}`, data);
}

async function testAll() {
  console.log("Testing /instance/all");
  const res = await fetch(`${API_URL}/instance/all`, {
    headers: { "apikey": API_KEY }
  });
  const data = await res.json();
  console.log(`Status: ${res.status}`, data);
}

await testAll();
await test("instanceId");
await test("instance");
await test("InstanceId");

