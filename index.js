const path = require("path");
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { handleCommands } = require("./core/handleCommands.js");
const { participantsUpdate } = require("./core/participantsUpdate.js");
const config = require("./config/bot.config.js");

exports.connect = async () => {
  const authPath = path.resolve(__dirname, ".", "assets", "auth", "creds");
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  if (!state.creds.registered) {
    const tempSock = makeWASocket({
      printQRInTerminal: false,
      version,
      logger: pino({ level: "silent" }),
      auth: state,
      browser: ["Bot WA", "Chrome", "1.0.0"],
    });

    const numeroBot = config.bot.replace(/[^0-9]/g, "");

    try {
      const code = await tempSock.requestPairingCode(numeroBot);
      console.log(`🔑 Código de pareamento do número ${numeroBot}: ${code}`);
    } catch (err) {
      console.error("Erro ao gerar código de pareamento:", err.message);
    }

    // Espera o usuário parear manualmente
    tempSock.ev.on("connection.update", (update) => {
      const { connection } = update;
      if (connection === "open") {
        console.log("✅ Pareamento concluído, iniciando o bot...");
        startBot(state, saveCreds, version);
      }
    });

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

      console.log("⚠️ Conexão fechada. Tentando reconectar...", shouldReconnect);

      if (shouldReconnect) {
        exports.connect();
      }
    } else if (connection === "open") {
      console.log("✅ Bot conectado com sucesso!");
      console.log(`👑 Dono: ${config.dono}`);
      console.log(`🤖 Bot: ${config.bot}`);
      console.log(`📍 Prefixo: ${config.prefixo}`);
      console.log(`📦 Versão: ${config.versao}`);
    }
  });

  sock.ev.on("creds.update", saveCreds);
  handleCommands(sock);
  participantsUpdate(sock);
}

this.connect();
