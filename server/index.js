import express from "express";
import path from "path";
import cluster from "cluster";
import os from "os";
import { fileURLToPath } from "url";
import router from "./routes/router.js";
import "dotenv/config";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const numCPUs = os.cpus().length;

const { PORT, NODE_ENV } = process.env;
const isDev = NODE_ENV !== "production";

// Multi-process to utilize all CPU cores.
if (!isDev && cluster.isPrimary) {
  console.error(`Node cluster master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i += 1) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.error(
      `Node cluster worker ${worker.process.pid} exited: code ${code}, signal ${signal}`
    );
  });
} else {
  const app = express();

  // Priority serve any static files.
  app.use(express.static(path.resolve(dirname, "../react-ui/build")));

  // Answer API requests.
  app.use("/api", router);

  // All remaining requests return the React app, so it can handle routing.
  app.get("*", (request, response) => {
    response.sendFile(path.resolve(dirname, "../react-ui/build", "index.html"));
  });

  app.listen(PORT, () => {
    console.error(
      `Node ${
        isDev ? "dev server" : `cluster worker ${process.pid}`
      }: listening on port ${PORT}`
    );
  });
}
