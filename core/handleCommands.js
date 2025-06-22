const fs = require("fs");
const path = require("path");
const { prefixo } = require("../config/bot.config");

const comandosGrupos = [];
const comandosPv = [];

const gruposPath = path.join(__dirname, "..", "comandos", "grupos");
const pvPath = path.join(__dirname, "..", "comandos", "pv");

fs.readdirSync(gruposPath).forEach(file => {
  const cmd = require(path.join(gruposPath, file));
  comandosGrupos.push(cmd);
});

fs.readdirSync(pvPath).forEach(file => {
  const cmd = require(path.join(pvPath, file));
  comandosPv.push(cmd);
});

module.exports.handleCommands = (sock) => {
  sock.ev.on("messages.upsert", async (msg) => {
    const m = msg.messages[0];
    if (!m?.message || m.key.fromMe) return;

    const messageType = Object.keys(m.message)[0];
    const text = m.message.conversation || m.message[messageType]?.text || "";

    if (!text.startsWith(prefixo)) return;

    const comando = text.slice(1).split(" ")[0].toLowerCase();
    const from = m.key.remoteJid;

    const isGroup = from.endsWith("@g.us");

    if (isGroup) {
      const encontrado = comandosGrupos.find(cmd => cmd.comando === comando);
      if (encontrado) {
        try {
          await encontrado.exec(sock, m);
        } catch (err) {
          console.log(`Erro no comando ${comando} (grupo):`, err.message);
        }
      }
    } else {
      const encontrado = comandosPv.find(cmd => cmd.comando === comando);
      if (encontrado) {
        try {
          await encontrado.exec(sock, m);
        } catch (err) {
          console.log(`Erro no comando ${comando} (PV):`, err.message);
        }
      }
    }
  });
};
