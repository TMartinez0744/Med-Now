const ASSISTANT_NAME = "AlivIA";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
8. Si te preguntan quién sos o qué hacés, presentate como "${ASSISTANT_NAME}, el asistente médico virtual de MedNow".`;

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
