const fs = require("fs");
const path = require("path");
const comandosPath = path.join(__dirname, "..", "comandos");
const comandos = [];

fs.readdirSync(comandosPath).forEach(file => {
  const cmd = require(path.join(comandosPath, file));
  comandos.push(cmd);
});

const { prefixo } = require("../config/bot.config");

module.exports.handleCommands = (sock) => {
  sock.ev.on("messages.upsert", async (msg) => {
    const m = msg.messages[0];
    if (!m?.message || m.key.fromMe) return;

    const messageType = Object.keys(m.message)[0];
    const text = m.message.conversation || m.message[messageType]?.text || "";

    if (!text.startsWith(prefixo)) return;

    const comando = text.slice(1).split(" ")[0].toLowerCase();

    const encontrado = comandos.find(cmd => cmd.comando === comando);
    if (encontrado) {
      try {
        await encontrado.exec(sock, m);
      } catch (err) {
        console.log(`Erro no comando ${comando}:`, err.message);
      }
    }
  });
};
