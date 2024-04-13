import fs from "fs";
import Queue from "bull";

const TRANSACTIONS_FILE = "./crafted-transactions.txt";

const submitTransaction = async (tx: string, id: number, done: any) => {
  await new Promise((resolve) => setTimeout(resolve, 350));

  const request = await fetch("https://mempool.space/testnet/api/tx", {
    method: "POST",
    body: tx,
  });

  const data = await request.text();

  console.log(
    `Transaction [${id}] ::`,
    data,
    `${new Date().toLocaleTimeString()}`
  );

  done();
};

const queue = new Queue("mempool.space-relayer");

queue.process((job, done) => {
  const tx = job.data.tx;

  submitTransaction(tx, job.data.id, done);
});

const transactions = fs.readFileSync(TRANSACTIONS_FILE, "utf8").split("\n");

transactions.map((tx, id) => {
  queue.add({ tx, id });
});
