import fs from "fs";
import { Address, Signer, Tap, Tx } from "@cmdcode/tapscript";
import util from "@cmdcode/crypto-utils";
import { assembleScript } from "./helpers";

const seckey = Buffer.from("PRIV_KEY_HERE", "hex");
const pubkey = util.keys.get_pubkey(seckey, true);

const [tseckey] = Tap.getSecKey(seckey);
const [tpubkey] = Tap.getPubKey(pubkey);

const targetAddress = Address.p2tr.fromPubKey(tpubkey, "testnet");

const xop = "@moto:swap::cbrc-20:swap?ab=PIZZA-WAGMI&a=1&b=0.00001143";

const transactionSplitter = (utxo: string) => {
  const [txid, index] = utxo.split(":");

  const inscribedXop = assembleScript(pubkey, xop);

  const tapleaf = Tap.encodeScript(inscribedXop);

  const [tspubkey, _] = Tap.getPubKey(pubkey, { target: tapleaf });

  const tsAddress = Address.p2tr.fromPubKey(tspubkey, "testnet");

  const vouts = Array(2000).fill({
    // change 5000 to 100
    value: 1_500,
    scriptPubKey: Address.toScriptPubKey(tsAddress),
  });

  const vin = [
    {
      txid,
      vout: Number(index),
      prevout: {
        value: 8_100_000, // change to 107_000
        scriptPubKey: ["OP_1", tpubkey],
      },
    },
  ];

  const txnData = Tx.create({
    vin,
    vout: [
      ...vouts,
      {
        value: 4_700_000,
        scriptPubKey: ["OP_1", tpubkey],
      },
    ],
  });

  const sig = Signer.taproot.sign(tseckey, txnData, 0);

  txnData.vin[0].witness = [sig];

  const txHex = Tx.encode(txnData).hex;

  return {
    inscriptionAddress: tsAddress,
    txHex,
  };
};

const createUtxo = (utxos: string) => {
  const [txid, index] = utxos.split(":");

  const inscribedXop = assembleScript(pubkey, xop);

  const tapleaf = Tap.encodeScript(inscribedXop);

  const [tpubkey, cblock] = Tap.getPubKey(pubkey, { target: tapleaf });

  const vin = [
    {
      txid,
      vout: Number(index),
      prevout: {
        value: 1_500, // change to 1000
        scriptPubKey: ["OP_1", tpubkey],
      },
    },
  ];

  const vout = [
    {
      value: 333, // change to 697
      scriptPubKey: Address.toScriptPubKey(targetAddress),
    },
  ];

  const txnData = Tx.create({
    vin,
    vout,
  });

  const sig = Signer.taproot.sign(seckey, txnData, 0, { extension: tapleaf });

  txnData.vin[0].witness = [sig, inscribedXop, cblock];

  const txHex = Tx.encode(txnData).hex;

  return txHex;
};

const transactionsCrafter = (txid: string) => {
  const utxos = Array.from({ length: 1920 }, (_, i) => `${txid}:${i}`); // change to 100

  utxos.forEach((utxo) => {
    const createdUtxo = createUtxo(utxo);

    fs.writeFileSync("./crafted-transactions.txt", `${createdUtxo}\n`, {
      flag: "a",
    });
  });
};

// b4b8a2ec13703f22409cfe25dbfdf8052b5b02c259c1120f959c7ab9147fac81:0

const utxo =
  "196c8c65a808512f1b07e2149748eeb5a485b5f221de4d0beb2a346fcae67ea8:0";

// 1st step
fs.writeFileSync("./txn.txt", transactionSplitter(utxo).txHex);

// 2nd step
// take the txid from the previously created transaction and craft the transactions
/* transactionsCrafter(
  "0e24529b5dbdce56d1201f3ac0ebbe673ce67692c0ef41a525059fa1212fb81a"
); */

// 3rd step
// start sending the transactions to the network