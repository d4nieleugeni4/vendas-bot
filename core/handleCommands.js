const fs = require("fs");
const path = require("path");
const { prefixo } = require("../config/bot.config");

const comandosGrupos = [];
const comandosPv = [];

const gruposPath = path.join(__dirname, "..", "comandos", "grupos");
const pvPath = path.join(__dirname, "..", "comandos", "pv");

// Carregar comandos de grupo
fs.readdirSync(gruposPath).forEach(file => {
  const cmd = require(path.join(gruposPath, file));
  comandosGrupos.push(cmd);
});

// Carregar comandos de PV
fs.readdirSync(pvPath).forEach(file => {
  const cmd = require(path.join(pvPath, file));
  comandosPv.push(cmd);
});

// Importa o de saudação separadamente
const saudacao = require("../comandos/pv/saudacao.js");

module.exports.handleCommands = (sock) => {
  sock.ev.on("messages.upsert", async (msg) => {
    const m = msg.messages[0];
    if (!m?.message || m.key.fromMe) return;

    const messageType = Object.keys(m.message)[0];
    const text = m.message.conversation || m.message[messageType]?.text || "";

    const from = m.key.remoteJid;
    const isGroup = from.endsWith("@g.us");

    if (!isGroup) {
      // Sempre envia saudação no PV
      await saudacao.exec(sock, m);
    }

    if (!text.startsWith(prefixo)) return;

    const comando = text.slice(1).split(" ")[0].toLowerCase();

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
