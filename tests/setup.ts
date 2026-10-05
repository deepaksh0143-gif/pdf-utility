import os from "node:os";
import path from "node:path";
import process from "node:process";

process.env.TMP_DIR = path.join(
  os.tmpdir(),
  `pdf-utility-test-${process.pid}-${Date.now()}`,
);
process.env.SWEEP_INTERVAL_MS = "60000";
