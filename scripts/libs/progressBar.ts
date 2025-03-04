import { exit } from "node:process";
import { MyTweet } from "./types.ts";

class ProgressTracker {
    private currentTweet = 0;
    private totalTweets = 0;
    private readonly filledChar = "#";
    private readonly emptyChar = " ";

    // Initialize progress tracking
    public initProgress(total: number) {
        this.currentTweet = 0;
        this.totalTweets = total;
    }

    // Create an async iterator that tracks progress while yielding elements
    public async *iterate<T>(items: T[]): AsyncGenerator<T> {
        this.initProgress(items.length);
        for (const item of items) {
            this.currentTweet++;
            yield item;
        }
    }

    // Display a single tweet with progress
    public async displayTweetProgress(tweet: MyTweet) {
        // Calculate bar width based on terminal size
        const terminalWidth = Deno.consoleSize().columns - 10;
        const barWidth = Math.min(terminalWidth, 50); // Cap width at 50 chars

        // Calculate progress
        this.currentTweet++;
        const progress = this.totalTweets > 0
            ? (this.currentTweet / this.totalTweets) * 100
            : 0;
        const filledWidth = Math.floor((progress / 100) * barWidth);

        // Build progress bar string
        const bar = "[" +
            this.filledChar.repeat(filledWidth) +
            this.emptyChar.repeat(barWidth - filledWidth) +
            "]";

        // Clear previous line and print progress
        console.log("\x1b[1A\x1b[2K"); // Move up 1 line and clear it
        console.log("\x1b[1A\x1b[2K"); // Clear tweet line

        // Print current tweet and progress
        console.log(tweet.tweet);
        console.log(`${bar} ${Math.floor(progress)}%`);

        await new Promise((resolve) => setTimeout(resolve, 100));

        // Show completion message if done
        if (this.currentTweet === this.totalTweets) {
            const completeBar = "[" + this.filledChar.repeat(barWidth) + "]";
            console.log("\x1b[1A\x1b[2K"); // Move up 1 line and clear it
            console.log("\x1b[1A\x1b[2K"); // Clear tweet line
            console.log(tweet.tweet);
            console.log(`${completeBar} 100%`);
            console.log("Done!");
        }
    }
}

const elems: MyTweet[] = [
    {
        "id": "1895724907880657360",
        "tweet":
            "En la segunda parte de la serie sobre sidestepping, profundizaremos en un análisis profundo de lo complicado que es walk the talk en términos de articular una estrategia de océano azul,  la abducción y la conexión de estos conceptos con el CPS. Vamos a ello. https://t.co/fzEZG3f27S",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:53.000Z",
        "url": "https://x.com/Recuenco/status/1895724907880657360",
        "stats": {
            "replies": "8",
            "retweets": "17",
            "likes": "110",
            "views": "26378",
        },
        "metadata": {
            "type": "media",
            "imgs": [
                {
                    "img": "",
                    "url": "https://pbs.twimg.com/media/Gk73wY5XUAAaPNa.png",
                },
            ],
        },
    },
    {
        "id": "1895724910200111453",
        "tweet":
            "La serie promete ser larga, porque las implicaciones de lo que planteamos son de calado. Paciencia y a esperar el cierre, que vale la pena, no como el final de [Inserte aquí su serie echada a perder favorita] \nhttps://t.co/uVWttOprKA",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:54.000Z",
        "url": "https://x.com/Recuenco/status/1895724910200111453",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "8",
            "views": "2159",
        },
    },
    {
        "id": "1895724911248724085",
        "tweet":
            "Muchas veces he comentado que tener una visión, por clara que esta sea, no es tener una estrategia para conseguirla, y tener una estrategia no es tener un proofpoint.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:54.000Z",
        "url": "https://x.com/Recuenco/status/1895724911248724085",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "9",
            "views": "1411",
        },
    },
    {
        "id": "1895724912184061972",
        "tweet":
            "Esto es particularmente evidente cuando la visión es clara, la articulación de la estrategia para resolver el problema es compleja y el proofpoint implica un salto en el vacío.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:54.000Z",
        "url": "https://x.com/Recuenco/status/1895724912184061972",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "7",
            "views": "1363",
        },
    },
    {
        "id": "1895724916680380760",
        "tweet":
            "Voy a poner varios ejemplos, para que entendamos mejor el pattern que yo llamo el triángulo isósceles del CPS: https://t.co/96gMlFQCj6",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:55.000Z",
        "url": "https://x.com/Recuenco/status/1895724916680380760",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "7",
            "views": "1415",
        },
        "metadata": {
            "type": "media",
            "imgs": [
                {
                    "img": "",
                    "url": "https://pbs.twimg.com/media/Gk73w-HWMAAClCL.png",
                },
            ],
        },
    },
    {
        "id": "1895724917842116978",
        "tweet":
            "Ultimo teorema de Fermat (Planteamiento obvio e impecable) -&gt; Necesidad de entender curvas elípticas (Inaccesible en tiempos de Fermat) -&gt; Demostración complejísima.\nhttps://t.co/NFeB45BVZ5",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:55.000Z",
        "url": "https://x.com/Recuenco/status/1895724917842116978",
        "stats": {
            "replies": "2",
            "retweets": "0",
            "likes": "11",
            "views": "4023",
        },
    },
    {
        "id": "1895724918999773634",
        "tweet":
            "Planteamiento de Bosón de Higgs (Formalmente impecable) -&gt; Necesidad de construir un LHC gigantesco (Inaccesible hasta hace poco) -&gt; Demostración indirecta complejísima.\nhttps://t.co/G4lA8CQakH",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:56.000Z",
        "url": "https://x.com/Recuenco/status/1895724918999773634",
        "stats": {
            "replies": "1",
            "retweets": "1",
            "likes": "11",
            "views": "1765",
        },
    },
    {
        "id": "1895724920195137613",
        "tweet":
            "La distancia entre el ápice del problema y su cierre/conclusión satisfactoria lleva aparejada una cantidad de tiempo y esfuerzo que se puede medir en décadas (Higgs) o en Siglos (Fermat).",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:56.000Z",
        "url": "https://x.com/Recuenco/status/1895724920195137613",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "9",
            "views": "1058",
        },
    },
    {
        "id": "1895724921050771584",
        "tweet":
            "Muchas veces he hablado de un proceso similar en la Personotecnia, que todavía no ha hallado una adopción masiva por la misma razón.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:56.000Z",
        "url": "https://x.com/Recuenco/status/1895724921050771584",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "8",
            "views": "1040",
        },
    },
    {
        "id": "1895724921889677675",
        "tweet":
            "Planteamiento de la visión en The One to One Future (Maravilloso, pero desde el marketing, cero accionable) -&gt; Relevance (Sperber) + Personalización (Recuenco) -&gt; Personotecnia (Enorme barrera de entrada) \nhttps://t.co/qFUF1X5VMk",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:56.000Z",
        "url": "https://x.com/Recuenco/status/1895724921889677675",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "9",
            "views": "1461",
        },
    },
    {
        "id": "1895724923068281333",
        "tweet":
            "Se puede hacer, pero es complejísimo, así que cada vez que haya una plataforma técnica nueva de moda volvemos a dar la turra con que esta vez si, que ahora si se puede. \nhttps://t.co/67wDVHb16b",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:57.000Z",
        "url": "https://x.com/Recuenco/status/1895724923068281333",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "9",
            "views": "1397",
        },
    },
    {
        "id": "1895724929053511714",
        "tweet":
            "Pillamos el patrón, no? Ahora viene la pregunta. El libro de Chan &amp; Mauborgne nos plantea una visión maravillosa, pero como accedemos a un océano azul? Como se detecta? Como se aborda? Como sabemos si una propuesta lo ha identificado correctamente y no es una gárgara cósmica? https://t.co/fW4pOXpon3",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:58.000Z",
        "url": "https://x.com/Recuenco/status/1895724929053511714",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "8",
            "views": "971",
        },
        "metadata": {
            "type": "media",
            "imgs": [
                {
                    "img": "",
                    "url":
                        "https://video.twimg.com/tweet_video/Gk73xpjWQAAWgp0.mp4",
                },
            ],
        },
    },
    {
        "id": "1895724930332823752",
        "tweet":
            "En esencia, un océano azul es un vacío, una demanda que no se satisface. Un problema existente que no se resuelve.\nNo hay una sistemática asociada, así que nos queda? El CPS.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:58.000Z",
        "url": "https://x.com/Recuenco/status/1895724930332823752",
        "stats": {
            "replies": "1",
            "retweets": "1",
            "likes": "10",
            "views": "890",
        },
    },
    {
        "id": "1895724931255513444",
        "tweet":
            "El CPS forma hipótesis por una mezcla de procesos que tienen que ver con dos términos clásicos, la deducción y la inducción, y un tercer proceso menos conocido, la abducción.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:59.000Z",
        "url": "https://x.com/Recuenco/status/1895724931255513444",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "11",
            "views": "883",
        },
    },
    {
        "id": "1895724932174148063",
        "tweet":
            "Charles Sanders Peirce, filósofo y lógico estadounidense, desarrolló el concepto de abducción como una forma de razonamiento distinta de la deducción y la inducción.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:59.000Z",
        "url": "https://x.com/Recuenco/status/1895724932174148063",
        "stats": {
            "replies": "1",
            "retweets": "1",
            "likes": "10",
            "views": "879",
        },
    },
    {
        "id": "1895724933147140406",
        "tweet":
            "La abducción es un proceso inferencial que busca generar hipótesis explicativas a partir de hechos observados, siendo especialmente útil cuando nos enfrentamos a fenómenos sorprendentes o inexplicados.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:59.000Z",
        "url": "https://x.com/Recuenco/status/1895724933147140406",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "11",
            "views": "864",
        },
    },
    {
        "id": "1895724934040637468",
        "tweet":
            "El punto de partida de la abducción es la identificación de un hecho o fenómeno que no encaja con nuestras expectativas o conocimientos previos.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:36:59.000Z",
        "url": "https://x.com/Recuenco/status/1895724934040637468",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "7",
            "views": "838",
        },
    },
    {
        "id": "1895724934954979661",
        "tweet":
            'Peirce lo describe como algo que "nos llama la atención" porque no puede explicarse fácilmente con las reglas o leyes que ya conocemos.\nEjemplo: "Observamos que las luces de una casa se encienden solas todas las noches, aunque nadie vive allí."',
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:00.000Z",
        "url": "https://x.com/Recuenco/status/1895724934954979661",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "8",
            "views": "828",
        },
    },
    {
        "id": "1895724935873544352",
        "tweet":
            "A partir de la observación, se propone una hipótesis que, de ser cierta, explicaría el hecho sorprendente. Esta hipótesis no surge de manera arbitraria, sino que se basa en el conocimiento disponible y en la creatividad del razonador para conectar ideas.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:00.000Z",
        "url": "https://x.com/Recuenco/status/1895724935873544352",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "8",
            "views": "834",
        },
    },
    {
        "id": "1895724936800481282",
        "tweet":
            'Peirce enfatiza que la abducción es un acto de "conjetura" guiado por la economía de pensamiento (elegir la explicación más simple o plausible).\nEjemplo: "Supongamos que hay un temporizador eléctrico programado para encender las luces automáticamente."',
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:00.000Z",
        "url": "https://x.com/Recuenco/status/1895724936800481282",
        "stats": {
            "replies": "1",
            "retweets": "1",
            "likes": "8",
            "views": "785",
        },
    },
    {
        "id": "1895724937735770350",
        "tweet":
            "Aunque la abducción no prueba la hipótesis (eso corresponde a la deducción y la inducción), sí implica una evaluación inicial de su plausibilidad. Es una herramienta básica del proceso de sensemaking en el CPS.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:00.000Z",
        "url": "https://x.com/Recuenco/status/1895724937735770350",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "9",
            "views": "769",
        },
    },
    {
        "id": "1895724938679496922",
        "tweet":
            'Peirce sugiere que la hipótesis debe ser comprobable y capaz de conducir a predicciones que puedan verificarse posteriormente.\nEjemplo: "Si hay un temporizador, entonces deberíamos encontrar un dispositivo físico conectado al sistema eléctrico de la casa."',
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:00.000Z",
        "url": "https://x.com/Recuenco/status/1895724938679496922",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "9",
            "views": "755",
        },
    },
    {
        "id": "1895724939589693576",
        "tweet":
            "Peirce formalizó la abducción en un esquema lógico que la distingue de otros tipos de razonamiento.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:01.000Z",
        "url": "https://x.com/Recuenco/status/1895724939589693576",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "7",
            "views": "731",
        },
    },
    {
        "id": "1895724940478882066",
        "tweet":
            "Hecho sorprendente (Resultado): Hay un fenómeno observado (C).\nRegla potencial (Causa): Si A fuera cierto, entonces C sería esperable como consecuencia.\nConclusión (Hipótesis): Por lo tanto, hay razones para sospechar que A podría ser cierto.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:01.000Z",
        "url": "https://x.com/Recuenco/status/1895724940478882066",
        "stats": {
            "replies": "2",
            "retweets": "0",
            "likes": "9",
            "views": "763",
        },
    },
    {
        "id": "1895724941389037788",
        "tweet":
            'Hecho: "Las luces se encienden solas (C)."\nRegla: "Si hay un temporizador (A), las luces se encenderían automáticamente (C)."\nConclusión: "Es posible que haya un temporizador (A)."',
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:01.000Z",
        "url": "https://x.com/Recuenco/status/1895724941389037788",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "9",
            "views": "720",
        },
    },
    {
        "id": "1895724942294937998",
        "tweet":
            "Las características clave del proceso nos serán familiares a los viejos rockeros del CPS.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:01.000Z",
        "url": "https://x.com/Recuenco/status/1895724942294937998",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "7",
            "views": "692",
        },
    },
    {
        "id": "1895724943188296171",
        "tweet":
            "Creatividad: La abducción requiere intuición y creatividad para generar hipótesis nuevas, algo que Peirce consideraba esencial para el avance del conocimiento.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:01.000Z",
        "url": "https://x.com/Recuenco/status/1895724943188296171",
        "stats": {
            "replies": "1",
            "retweets": "1",
            "likes": "9",
            "views": "716",
        },
    },
    {
        "id": "1895724944119468509",
        "tweet":
            "Provisionalidad: Las hipótesis abductivas no son definitivas; son conjeturas que deben ser probadas mediante deducción (para derivar consecuencias) e inducción (para verificarlas empíricamente).",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:02.000Z",
        "url": "https://x.com/Recuenco/status/1895724944119468509",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "11",
            "views": "698",
        },
    },
    {
        "id": "1895724945021219169",
        "tweet":
            "Economía: Peirce insistía en que la hipótesis debe ser simple y práctica, evitando especulaciones innecesariamente complejas.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:02.000Z",
        "url": "https://x.com/Recuenco/status/1895724945021219169",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "13",
            "views": "690",
        },
    },
    {
        "id": "1895724945897926688",
        "tweet":
            "Peirce veía la abducción como el primer paso en el proceso científico. De hecho, al igual que el CPS, considera que la aproximación Popperiana no es normalmente posible en problemas complejos, lo que no debería prevenir los gedankenexperiment. https://t.co/PSjgkVlIZs",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:02.000Z",
        "url": "https://x.com/Recuenco/status/1895724945897926688",
        "stats": {
            "replies": "2",
            "retweets": "0",
            "likes": "9",
            "views": "1496",
        },
    },
    {
        "id": "1895724947097428175",
        "tweet":
            "Abducción: Genera una hipótesis (¿Qué podría explicarlo?).\nDeducción: Deriva consecuencias lógicas de la hipótesis (¿Qué pasaría si fuera cierta?).\nInducción: Prueba la hipótesis con observaciones empíricas (¿Se confirma o no?).",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:02.000Z",
        "url": "https://x.com/Recuenco/status/1895724947097428175",
        "stats": {
            "replies": "1",
            "retweets": "1",
            "likes": "15",
            "views": "657",
        },
    },
    {
        "id": "1895724947999219792",
        "tweet":
            'Abducción: "Podría haber un temporizador."\nDeducción: "Si hay un temporizador, las luces seguirán un patrón horario."\nInducción: "Observamos durante varios días y confirmamos el patrón."',
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:03.000Z",
        "url": "https://x.com/Recuenco/status/1895724947999219792",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "10",
            "views": "463",
        },
    },
    {
        "id": "1895724949085507985",
        "tweet":
            "El proceso de abducción según Peirce es un razonamiento hipotético que parte de la sorpresa ante un hecho y culmina en la propuesta de una explicación plausible pero provisional.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:03.000Z",
        "url": "https://x.com/Recuenco/status/1895724949085507985",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "10",
            "views": "455",
        },
    },
    {
        "id": "1895724949974765620",
        "tweet":
            "Es un método fundamental para la generación de ideas nuevas, especialmente en la ciencia, la filosofía y la resolución de problemas cotidianos.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:03.000Z",
        "url": "https://x.com/Recuenco/status/1895724949974765620",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "10",
            "views": "462",
        },
    },
    {
        "id": "1895724960133345331",
        "tweet":
            "La madre que me matriculó en Estructura de Datos y de la Información. Turra limit hits. A ver que podemos sacar en claro de hoy. https://t.co/MVEfuRx1h3",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:06.000Z",
        "url": "https://x.com/Recuenco/status/1895724960133345331",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "6",
            "views": "680",
        },
        "metadata": {
            "type": "media",
            "imgs": [
                {
                    "img": "",
                    "url":
                        "https://video.twimg.com/tweet_video/Gk73zLvW4AA0xbf.mp4",
                },
            ],
        },
    },
    {
        "id": "1895724961370681513",
        "tweet":
            "Antes de nada disculpad por el slow build, pero es necesario para que todos entendamos lo complicado que es construir un caso de uso del CPS y su problemática asociada a la hora de trasladarlo a una propuesta comercial.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:06.000Z",
        "url": "https://x.com/Recuenco/status/1895724961370681513",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "10",
            "views": "439",
        },
    },
    {
        "id": "1895724962234630180",
        "tweet":
            "La metáfora del océano azul es perfectamente comprensible y tremendamente difícil de accionar. Fue una de tantas demandas no verbalizadas de la necesidad de una disciplina como el CPS.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:06.000Z",
        "url": "https://x.com/Recuenco/status/1895724962234630180",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "10",
            "views": "435",
        },
    },
    {
        "id": "1895724963153297880",
        "tweet":
            "El CPS es una herramienta extraordinariamente compleja con infinidad de usos, y como toda herramienta maravillosa de propósito general, demanda muchísimo talento a la hora de gestionar el contexto que permita utilizarla como es debido.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:06.000Z",
        "url": "https://x.com/Recuenco/status/1895724963153297880",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "9",
            "views": "438",
        },
    },
    {
        "id": "1895724964059173212",
        "tweet":
            "Plantear un problema no quiere decir que lo tengas resuelto, como he indicado en muchas ocasiones.\nhttps://t.co/cOnNhTme6i",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:06.000Z",
        "url": "https://x.com/Recuenco/status/1895724964059173212",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "11",
            "views": "659",
        },
    },
    {
        "id": "1895724965145485703",
        "tweet":
            "En próximos hilos volveremos al caso de la Wii, a ver si podemos hacer abducción de algo parecido a una sistemática para el abordaje. En lugar de convertirlo en un caso o un success story, que nos lleva a heurísticos mentales cómodos, simples, y erróneos.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:07.000Z",
        "url": "https://x.com/Recuenco/status/1895724965145485703",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "10",
            "views": "455",
        },
    },
    {
        "id": "1895724966043099495",
        "tweet":
            "Y en próximos hilos hablaremos de la conejera, del síndrome de Séneca, y en general, del tiempo y el dinero que nos ha costado tener las cosas claras sobre como articular una propuesta comercial alrededor del CPS.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:07.000Z",
        "url": "https://x.com/Recuenco/status/1895724966043099495",
        "stats": {
            "replies": "1",
            "retweets": "0",
            "likes": "10",
            "views": "492",
        },
    },
    {
        "id": "1895724966919766436",
        "tweet":
            "Que, para variar, no es una puta anotación en el margen de un cuaderno. #Finhilo.",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:07.000Z",
        "url": "https://x.com/Recuenco/status/1895724966919766436",
        "stats": {
            "replies": "2",
            "retweets": "0",
            "likes": "9",
            "views": "502",
        },
    },
    {
        "id": "1895724967758573740",
        "tweet":
            "P.D. I: Los libros de aventura matemática son de mis prefericos: https://t.co/V1rzHDCtpR",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:07.000Z",
        "url": "https://x.com/Recuenco/status/1895724967758573740",
        "stats": {
            "replies": "2",
            "retweets": "0",
            "likes": "7",
            "views": "1949",
        },
    },
    {
        "id": "1895724968702332929",
        "tweet": "P.D.II: Absolutamente maravilloso: https://t.co/FprbCIjCbb",
        "author": "https://x.com/Recuenco",
        "time": "2025-03-01T06:37:08.000Z",
        "url": "https://x.com/Recuenco/status/1895724968702332929",
        "stats": {
            "replies": "3",
            "retweets": "1",
            "likes": "12",
            "views": "1926",
        },
    },
];

const progressTracker = new ProgressTracker();
progressTracker.initProgress(elems.length);
for (const elem of elems) {
    await progressTracker.displayTweetProgress(elem);
}
exit(0);
