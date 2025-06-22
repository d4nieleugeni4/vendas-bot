const path = require("path");
const fs = require("fs");
const pino = require("pino");
const readline = require("readline");
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const { handleCommands } = require("./core/handleCommands.js");
const { participantsUpdate } = require("./core/participantsUpdate.js");
const config = require("./config/bot.config.js");

// Pergunta no terminal (se quiser usar em alguma parte, já tá pronto)
const question = (string) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(string, (ans) => {
    rl.close();
    resolve(ans);
  }));
};

exports.connect = async () => {
  const authPath = path.resolve(__dirname, ".", "assets", "auth", "creds");
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();
  const numeroBot = config.bot.replace(/[^0-9]/g, "");

  if (!state.creds.registered) {
    const sock = makeWASocket({
      printQRInTerminal: false,
      version,
      logger: pino({ level: "silent" }),
      auth: state,
      browser: ["Bot WA", "Chrome", "1.0.0"],
    });

    try {
      const code = await sock.requestPairingCode(numeroBot);
      console.log(`📲 Código de pareamento do número ${numeroBot}: ${code}`);
      console.log("⏳ Você tem 1 minuto para conectar no WhatsApp...");
    } catch (err) {
      console.error("Erro ao gerar código de pareamento:", err.message);
      process.exit(1);
    }

    let conectado = false;

    sock.ev.on("connection.update", (update) => {
      const { connection } = update;
      if (connection === "open") {
        console.log("✅ Pareamento concluído, bot iniciando...");
        conectado = true;
        startBot(state, saveCreds, version);
      }
    });

    sock.ev.on("creds.update", saveCreds);

    // Timer de 1 minuto, se não conectar reinicia
    setTimeout(() => {
      if (!conectado) {
        console.log("⚠️ Tempo esgotado! Reiniciando processo de pareamento...");
        exports.connect();
      }
    }, 60 * 1000);

  } else {
    startBot(state, saveCreds, version);
  }
};

function startBot(state, saveCreds, version) {
  const sock = makeWASocket({
    printQRInTerminal: false,
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["Bot WA", "Chrome", "1.0.0"],
    markOnlineOnConnect: true,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log("❌ Conexão fechada:", lastDisconnect?.error?.message || "sem erro", "🔄 Reconectar?", shouldReconnect);

      if (shouldReconnect) {
        exports.connect();
      }
    } else if (connection === "open") {
      console.log("✅ Bot conectado com sucesso!");
      console.log(`👑 Dono: ${config.dono}`);
      console.log(`🤖 Bot: ${config.bot}`);
      console.log(`📍 Prefixo: ${config.prefixo}`);
      console.log(`📦 Versão: ${config.versao}`);

      handleCommands(sock);
      participantsUpdate(sock);
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

this.connect();
