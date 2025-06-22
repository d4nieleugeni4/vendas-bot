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
  const { state, saveCreds } = await useMultiFileAuthState(
    path.resolve(__dirname, ".", "assets", "auth", "creds")
  );

  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    printQRInTerminal: false,
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["Bot WA", "Chrome", "1.0.0"],
    markOnlineOnConnect: true,
  });

  if (!sock.authState.creds.registered) {
    const numeroBot = config.bot.replace(/[^0-9]/g, ""); // Limpa o número só com dígitos

    if (!numeroBot) {
      throw new Error("Número do bot não configurado corretamente em bot.config.js!");
    }

    try {
      const code = await sock.requestPairingCode(numeroBot);
      console.log(`🔑 Código de pareamento do número ${numeroBot}: ${code}`);
    } catch (err) {
      console.error("Erro ao gerar código de pareamento:", err.message);
    }
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log("⚠️ Conexão fechada. Tentando reconectar...", shouldReconnect);

      if (shouldReconnect) {
        this.connect();
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

  return sock;
};

this.connect();
