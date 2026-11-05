import { runSeed } from "./seed-core";

runSeed()
  .then((res) => {
    console.log(`✅ GAMINOS seed complete — ${res.stations} stations, ${res.customers} customers.`);
    console.log("   Owner login: owner@gaminos.test / gaminos123");
    console.log("   Staff login: staff@gaminos.test / staff123");
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  });
