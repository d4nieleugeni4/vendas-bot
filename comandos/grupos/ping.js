// comandos/grupos/ping.js
module.exports = {
  comando: "ping",
  exec: async (sock, m) => {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { text: "pong! (grupo)" });
  }
};
