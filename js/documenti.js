import { esc, icona } from "./ui.js";
const C = window.TESTO_CONFIG || {};
const T = esc(C.titolare || "Alfredo Nicolò Vespa"), IND = esc(C.indirizzo || "[indirizzo], 6702 Claro"), EM = esc(C.email || "[email]"), REG = esc(C.regioneDati || "Svizzera (Zurigo) o UE (Francoforte)");

const DOC = {
  privacy: ["Informativa sulla privacy", `
<p class="xs muted">Versione 0.1-test · fase di prova</p>
<h4>1. Chi tratta i tuoi dati</h4><p>Titolare: <b>${T}</b>, persona privata, ${IND}, Svizzera. Contatto: <a href="mailto:${EM}">${EM}</a>. T.E.S.T.O. è un'app gratuita in fase di prova, usata da un piccolo gruppo di persone invitate. Questa informativa segue la Legge federale sulla protezione dei dati (LPD).</p>
<h4>2. Quali dati</h4><ul>
<li><b>Account:</b> email e password (salvata solo cifrata).</li>
<li><b>Profilo:</b> username (nome scelto da te), anno di nascita, sesso, obiettivo, tipo di allenamento, livello, allenamenti a settimana, orari della giornata, abitudini (pesce, alimentazione vegana, caffeina, pasti uguali, cibi preferiti o da evitare).</li>
<li><b>Dati sulla salute</b> (solo con il tuo consenso esplicito): peso, altezza, infortuni o limitazioni.</li>
<li><b>Uso dell'app:</b> calendario, allenamenti (esercizi, serie, carichi), diario alimentare, consensi dati con data e versione.</li>
<li><b>Notifiche:</b> l'indirizzo tecnico del tuo telefono per i promemoria.</li>
<li><b>Dati tecnici:</b> indirizzo IP e registri tecnici dei fornitori (sicurezza).</li></ul>
<p>Non chiediamo nome, telefono, posizione o foto. Le conversazioni con l'assistente restano solo sul tuo telefono finché l'app è aperta e non vengono salvate sul server.</p>
<h4>3. Perché</h4><ul><li>Far funzionare l'app: account, salvataggi, calendario, promemoria (contratto).</li><li>Calcolare fabbisogni e piani personalizzati (consenso esplicito ai dati sulla salute, revocabile).</li><li>Rispondere con l'assistente IA (consenso, revocabile).</li><li>Sicurezza e prevenzione di abusi (interesse legittimo).</li></ul>
<p>Niente pubblicità, niente vendita di dati, niente addestramento di modelli di IA con i tuoi dati.</p>
<h4>4. L'assistente IA</h4><p>Le risposte sono <b>generate automaticamente da un'intelligenza artificiale</b>, sempre indicate come tali, e possono contenere errori. L'assistente riceve la domanda e i dati del profilo necessari, <b>senza email</b>. Fornitore: Groq Inc. (USA), modelli aperti (GPT-OSS). Secondo le condizioni di Groq le richieste non vengono usate per addestrare modelli. I dati vengono trasferiti negli Stati Uniti, che per la Svizzera non hanno un livello di protezione equivalente: il trasferimento avviene solo con il tuo consenso esplicito all'assistente IA (art. 17 cpv. 1 lett. a LPD), che puoi revocare in ogni momento in Profilo → Privacy.</p>
<h4>5. Fornitori (responsabili del trattamento)</h4><ul>
<li><b>Supabase</b> – database e accesso, server in ${REG}.</li>
<li><b>Groq</b> (Groq Inc., USA) – modello dell'assistente IA; riceve solo domanda, note dell'archivio e dati del profilo necessari, senza email.</li>
<li><b>GitHub</b> (GitHub Inc., USA) – pubblica i file dell'app. Non riceve i tuoi dati dell'app, ma vede l'indirizzo IP quando apri l'app.</li>
<li><b>Apple, Google o Mozilla</b> – consegnano le notifiche al telefono; possono trovarsi anche negli USA. Per questo il testo dei promemoria contiene solo nome della voce e ora, senza dati sulla salute.</li>
<li><b>jsDelivr / GitHub</b> – immagini degli esercizi (vedono l'indirizzo IP).</li></ul>
<h4>6. Paesi</h4><p>I dati dell'app restano in Svizzera e nell'Unione europea (Paesi con protezione adeguata). Eccezioni: GitHub, jsDelivr e i servizi di notifica possono trovarsi negli USA e ricevono solo dati tecnici (IP) o il testo generico del promemoria. Usando l'app nella fase di prova acconsenti a questi trasferimenti tecnici.</p>
<h4>7. Per quanto tempo</h4><p>Finché hai l'account. Se lo elimini, i dati vengono cancellati subito dal database (le copie di sicurezza del fornitore si sovrascrivono entro pochi giorni). Alla fine della fase di prova ti avvisiamo e cancelliamo gli account che non vuoi tenere.</p>
<h4>8. Sicurezza</h4><p>Connessione cifrata, password cifrate, accesso ai dati limitato: ogni persona vede solo i propri dati (regole di sicurezza nel database).</p>
<h4>9. I tuoi diritti</h4><p>Puoi sapere quali dati abbiamo, correggerli, scaricarli (Profilo → Privacy → Scarica tutti i miei dati), cancellarli (Elimina account), revocare i consensi e opporti a un trattamento. Scrivi a <a href="mailto:${EM}">${EM}</a>: rispondiamo entro 30 giorni. Puoi rivolgerti all'Incaricato federale della protezione dei dati e della trasparenza (IFPDT).</p>
<h4>10. Età minima</h4><p>16 anni.</p>
<h4>11. Memoria del dispositivo</h4><p>Usiamo solo la memoria locale necessaria (accesso, app senza rete, chat in corso). Nessun cookie pubblicitario, nessuno strumento di analisi.</p>`],
  condizioni: ["Condizioni d'uso", `
<p class="xs muted">Versione 0.1-test · fase di prova</p>
<h4>1. Chi offre il servizio</h4><p>${T}, persona privata, ${IND}, Svizzera (<a href="mailto:${EM}">${EM}</a>).</p>
<h4>2. Cos'è</h4><p>Un'app gratuita di <b>fitness e benessere</b> in fase di prova: allenamenti, alimentazione, calendario con promemoria e un assistente basato su intelligenza artificiale che si appoggia a un archivio di studi scientifici. Funzioni, contenuti e nome possono cambiare.</p>
<h4>3. Non è un servizio medico</h4><p>T.E.S.T.O. <b>non è un dispositivo medico</b>, non fa diagnosi e non cura. Le informazioni sono generali e non sostituiscono medico o dietista. Se hai malattie, infortuni, sei in gravidanza, prendi farmaci o hai avuto disturbi alimentari, parlane prima con un medico. Con dolore al petto, svenimento o mancanza di fiato insolita fermati e chiedi aiuto (emergenza 144).</p>
<h4>4. Assistente IA</h4><p>Le risposte sono generate automaticamente, indicate come tali e possono contenere errori. Sei tu a decidere se seguirle e salvarle. Non dà indicazioni su farmaci con prescrizione né dosi, cicli o combinazioni di sostanze dopanti.</p>
<h4>5. Doping</h4><p>Le sostanze dopanti sono trattate solo per informare su effetti e rischi per la salute. In Svizzera fabbricarle, importarle, venderle, procurarle o prescriverle è punibile (Legge sulla promozione dello sport).</p>
<h4>6. Account</h4><p>Almeno 16 anni; dati corretti; password segreta; account personale. Puoi eliminarlo in ogni momento.</p>
<h4>7. Uso corretto</h4><p>Vietato usare l'app per scopi illegali, cercare di accedere ai dati di altri, sovraccaricare il servizio o copiarne sistematicamente i contenuti.</p>
<h4>8. Contenuti</h4><p>I tuoi dati restano tuoi. Testi, grafica e archivio appartengono al titolare o ai rispettivi autori; immagini degli esercizi e banca dati alimentare secondo le licenze indicate nei Crediti.</p>
<h4>9. Disponibilità</h4><p>Servizio gratuito in prova: non garantiamo che sia sempre disponibile o senza errori. Scarica ogni tanto i tuoi dati. In caso di chiusura avvisiamo almeno 30 giorni prima.</p>
<h4>10. Responsabilità</h4><p>Nei limiti di legge non rispondiamo dei danni derivanti dall'uso dell'app o dall'aver seguito informazioni e piani. Non vale per danni causati intenzionalmente o per colpa grave.</p>
<h4>11. Modifiche e diritto applicabile</h4><p>Le modifiche importanti vengono annunciate nell'app. Si applica il diritto svizzero; foro: Bellinzona, fatti salvi i fori imperativi (in particolare il domicilio del consumatore).</p>`],
  impressum: ["Impressum", `<p><b>T.E.S.T.O.</b> – Training · Evolution · Strength · Transformation · Optimization</p>
<ul><li>Offerta da: ${T} (persona privata)</li><li>Indirizzo: ${IND}, Svizzera</li><li>Email: <a href="mailto:${EM}">${EM}</a></li><li>Responsabile dei contenuti e della protezione dei dati: ${T}</li></ul>
<p>App di fitness e benessere in fase di prova. Non è un dispositivo medico.</p>`],
  crediti: ["Crediti e licenze", `<ul>
<li><b>Valori nutritivi:</b> Banca dati svizzera dei valori nutritivi, Ufficio federale della sicurezza alimentare e di veterinaria (USAV), naehrwertdaten.ch.</li>
<li><b>Esercizi (immagini e istruzioni):</b> Free Exercise DB (yuhonas/free-exercise-db), pubblico dominio (Unlicense).</li>
<li><b>Caratteri:</b> Inter, Unbounded, JetBrains Mono, Orbitron – SIL Open Font License.</li>
<li><b>Archivio scientifico:</b> sintesi originali basate su studi pubblicati (PubMed, Europe PMC, OpenAlex), citati per autore e anno.</li>
<li><b>Assistente IA:</b> Groq (modelli GPT-OSS).</li></ul>`],
};
export function mostra(el, id) {
  const d = DOC[id] || DOC.privacy;
  el.innerHTML = `<main class="stack"><button class="btn testo" style="align-self:flex-start" onclick="history.length>1?history.back():location.hash='#'">${icona("indietro", 18)} Indietro</button><h1>${d[0]}</h1><div class="card msg-ia"><div class="corpo-testo small">${d[1]}</div></div></main>`;
}
