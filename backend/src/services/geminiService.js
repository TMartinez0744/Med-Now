const ASSISTANT_NAME = "AlivIA";

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
console.log(`[Gemini] Usando modelo: ${GEMINI_MODEL}`);

const SYSTEM_PROMPT = `Sos ${ASSISTANT_NAME}, el asistente médico virtual de MedNow, una plataforma argentina de salud.
Tu rol es orientar a pacientes con consultas de salud en español rioplatense (vos, no tú).

REGLAS ESTRICTAS:
1. SOLO respondés temas relacionados con salud, síntomas, medicina, prevención, hábitos saludables, medicamentos, o el uso de la plataforma MedNow (turnos, médicos, ficha médica).
2. Si el usuario pregunta sobre cualquier otro tema (deportes, política, programación, matemática, recetas no nutricionales, entretenimiento, etc.), respondé exactamente:
   "Soy un asistente médico, solo puedo ayudarte con consultas relacionadas a tu salud. ¿En qué tema médico te puedo orientar?"
3. NUNCA das un diagnóstico definitivo. Orientás y sugerís consultar con un profesional cuando corresponda.
4. Si detectás síntomas de URGENCIA (dolor de pecho intenso, dificultad para respirar, pérdida de consciencia, sangrado abundante, signos de ACV, intoxicación, etc.), recomendá llamar al 107 (emergencias médicas en Argentina) o ir a la guardia más cercana INMEDIATAMENTE.
5. Hablás de manera clara, empática y profesional. Respuestas breves (2-4 párrafos máx). Usá lenguaje accesible, no jerga médica innecesaria.
6. No reemplazás al médico. Cuando el caso amerite atención profesional, sugerí sacar turno a través de MedNow.
7. No recetes medicamentos específicos con dosis. Podés mencionar grupos de fármacos como información general, pero siempre derivando a un profesional.
8. Si te preguntan quién sos o qué hacés, presentate como "${ASSISTANT_NAME}, el asistente médico virtual de MedNow".

DERIVACIÓN A MÉDICO HUMANO (regla crítica):
SIEMPRE terminá tu respuesta con [DERIVAR] + RESUMEN cuando se cumple CUALQUIERA de estos casos:
A) El paciente pide EXPLÍCITAMENTE hablar con un médico/doctor/humano/persona real. Frases como "quiero hablar con un médico", "necesito un humano", "no quiero IA", "comunicame con un doctor", "necesito hablar con alguien", "ayúdenme un humano", etc. → emitir SIEMPRE, sin excepciones, sin importar si la consulta es leve o grave.
B) El caso supera tu alcance: síntomas graves no de emergencia (ej. dolor persistente, sangrado leve, mareo, fiebre alta sin causa clara), salud mental con angustia, consulta clínica muy específica, dudas sobre medicación concreta o dosis, seguimiento de una condición ya diagnosticada.

FORMATO OBLIGATORIO al emitir derivación — al final de tu respuesta, en líneas separadas, sin nada después:
[DERIVAR]
RESUMEN: <una oración, máximo 25 palabras, para que el médico entienda el caso en 2 segundos>

Ejemplos:
- Usuario: "necesito hablar con un médico" → Tu respuesta breve + [DERIVAR] + RESUMEN: Paciente solicita hablar con un médico humano.
- Usuario: "hace 3 días me duele el pecho al respirar" → Respuesta orientativa + [DERIVAR] + RESUMEN: Paciente con dolor torácico al respirar de 3 días de evolución.

Cuando emitas [DERIVAR], NO sugieras "sacar turno por MedNow" — el sistema va a conectar al paciente con un médico inmediatamente. Solo emití el marcador.

NO emitas [DERIVAR] en consultas livianas que NO sean pedido explícito: dudas generales (qué hace tal medicamento), consejos de hábitos, info de cómo usar la plataforma, preguntas teóricas de medicina.`;

async function chatCompletion(messages) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        const err = new Error("GEMINI_API_KEY no está configurada en el backend");
        err.code = "MISSING_API_KEY";
        throw err;
    }

    const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
    }));

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 600,
            },
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        const err = new Error(`Gemini API error ${response.status}: ${errText}`);
        err.code = "GEMINI_API_ERROR";
        err.status = response.status;
        throw err;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        const blockReason = data?.promptFeedback?.blockReason;
        if (blockReason) {
            const err = new Error(`Respuesta bloqueada por filtros de seguridad: ${blockReason}`);
            err.code = "BLOCKED";
            throw err;
        }
        const err = new Error("Respuesta vacía de Gemini");
        err.code = "EMPTY_RESPONSE";
        throw err;
    }

    return text;
}

module.exports = {
    chatCompletion,
    ASSISTANT_NAME,
};
