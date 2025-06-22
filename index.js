const path = require("path");
const fs = require("fs");
const pino = require("pino");
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const { handleCommands } = require("./core/handleCommands.js");
const { participantsUpdate } = require("./core/participantsUpdate.js");
const { showBanner, startBannerLoop } = require("./src/utils/terminal.js");
const config = require("./config/bot.config.js");

let botStatus = 'Iniciando...';

exports.connect = async () => {
  const authPath = path.resolve(__dirname, ".", "assets", "auth", "creds");

  // Mostrar banner inicial
  showBanner(botStatus);
  startBannerLoop(() => botStatus);

  if (!fs.existsSync(authPath)) {
    console.log("🔑 Nenhuma credencial encontrada! Inicie o pareamento.");
  }

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
        console.log("✅ Pareamento concluído, iniciando o bot...");
        conectado = true;
        startBot(state, saveCreds, version);
      }
    });

    sock.ev.on("creds.update", saveCreds);

    // Timer de 1 minuto pra conectar, se não reinicia
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

  botStatus = 'Conectando...';
  showBanner(botStatus);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      botStatus = 'Reconectando...';
      showBanner(botStatus);

      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log("❌ Conexão fechada:", lastDisconnect?.error?.message || "sem erro", "🔄 Reconectar?", shouldReconnect);

      if (shouldReconnect) {
        exports.connect();
      }
    } else if (connection === "open") {
      botStatus = 'Conectado';
      showBanner(botStatus);

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
