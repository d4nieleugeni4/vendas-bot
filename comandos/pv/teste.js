// comandos/pv/teste.js
module.exports = {
  comando: "teste",
  exec: async (sock, m) => {
    const from = m.key.remoteJid;
    await sock.sendMessage(from, { text: "Comando de teste no PV funcionando!" });
  }
};
