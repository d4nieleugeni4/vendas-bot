const config = require("../../config/bot.config");

const ultimasSaudacoes = {}; // Armazena última saudação por usuário

module.exports = {
  comando: "saudacao",
  exec: async (sock, m) => {
    const from = m.key.remoteJid;

    const agora = Date.now();
    const ultimaVez = ultimasSaudacoes[from] || 0;

    // 24 horas em milissegundos
    const intervalo = 24 * 60 * 60 * 1000;

    if (agora - ultimaVez >= intervalo) {
      ultimasSaudacoes[from] = agora;

      await sock.sendMessage(from, {
        text: `👋 Olá! Seja bem-vindo à ${config.loja}, estamos à disposição para te atender!`
      });
    }
  }
};
