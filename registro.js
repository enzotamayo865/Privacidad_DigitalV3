/*
  Camino de la privacidad: guarda las respuestas en una planilla de Google Sheets.

  Es anónimo: solo se manda qué pregunta se respondió, qué opción se eligió y si estaba bien.
  No se guarda ningún nombre, mail ni dato de la persona.

  Para activarlo, pegá entre las comillas la dirección de la aplicación web de Apps Script
  (termina en /exec). Si queda vacío, la página funciona igual pero no guarda nada.
*/
const URL_PLANILLA = "https://script.google.com/macros/s/AKfycbwmTz7mez5pNnHJmHKn4BEOZcq5oM-HQBntZVrExHLZmn6KmSKkaAV0b9roTMUsiBci/exec";

const CLAVE_PENDIENTES = "camino-privacidad:pendientes";
const MAX_PENDIENTES = 2000; // por si queda mucho tiempo sin internet

// Código al azar para agrupar las respuestas de una misma partida, sin saber quién es
function nuevoCodigoPartida() {
  const letras = "abcdefghijkmnpqrstuvwxyz23456789";
  let codigo = "";
  for (let i = 0; i < 8; i++) codigo += letras[Math.floor(Math.random() * letras.length)];
  return codigo;
}

function leerPendientes() {
  try {
    const lista = JSON.parse(localStorage.getItem(CLAVE_PENDIENTES) || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch (error) {
    return [];
  }
}

function guardarPendientes(lista) {
  try {
    if (lista.length) localStorage.setItem(CLAVE_PENDIENTES, JSON.stringify(lista.slice(-MAX_PENDIENTES)));
    else localStorage.removeItem(CLAVE_PENDIENTES);
  } catch (error) {
    // Si el navegador no deja guardar, se pierde solo lo que no se pudo mandar
  }
}

let enviando = false;

// Manda todo lo que esté esperando. Si no hay internet, queda guardado y se reintenta después.
async function enviarPendientes() {
  if (!URL_PLANILLA || enviando) return;
  const lista = leerPendientes();
  if (!lista.length) return;
  enviando = true;
  const tanda = lista.slice(0, 50);
  try {
    await fetch(URL_PLANILLA, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ filas: tanda }),
    });
    // Llegó: se sacan de la lista las que se mandaron
    const resto = leerPendientes().slice(tanda.length);
    guardarPendientes(resto);
    enviando = false;
    if (resto.length) enviarPendientes();
  } catch (error) {
    enviando = false; // sin conexión: se vuelve a intentar más tarde
  }
}

// Se llama cada vez que alguien responde una pregunta
function registrarRespuesta(datos) {
  if (!URL_PLANILLA) return;
  const lista = leerPendientes();
  lista.push({ ...datos, hora: new Date().toISOString() });
  guardarPendientes(lista);
  enviarPendientes();
}

// Reintentos: al volver internet y cada 30 segundos
window.addEventListener("online", enviarPendientes);
setInterval(enviarPendientes, 30000);
enviarPendientes();
