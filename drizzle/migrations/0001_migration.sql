INSERT INTO public.prompts (author, title, module, body) VALUES
('Ejemplo del curso','System prompt de asistente de soporte','M1 · Fundamentos de IA','Eres el asistente de soporte de [tienda online]. Responde de forma breve y profesional. Si no tienes la información, di "no lo sé" y ofrece pasar con una persona; nunca inventes políticas ni datos.'),
('Ejemplo del curso','Compactar una conversación larga','M1 · Fundamentos de IA','Resume esta conversación para continuarla en un chat nuevo. Céntrate en: [decisiones tomadas, requisitos acordados, dudas abiertas]. Descarta lo demás. Devuélvelo en viñetas cortas.'),
('Ejemplo del curso','Generar un prompt clasificador a partir de ejemplos','M1 · Fundamentos de IA','Te paso ejemplos etiquetados de preguntas con su dificultad (fácil / difícil). Escribe un prompt clasificador que, dada una pregunta nueva, decida su dificultad y explique en una frase por qué.

Ejemplos:
[pega aquí tus ejemplos]'),
('Ejemplo del curso','Convertir un proceso en Skill (SOP)','M2 · Productividad','Convierte este proceso que hago a mano en un SKILL.md. Incluye: nombre, cuándo se aplica, quién lo aplica, pasos, herramientas y reglas. Sé concreto y evita instrucciones contradictorias.

Proceso: [describe el proceso]'),
('Ejemplo del curso','Estructura de carpetas del proyecto','M2 · Productividad','Crea la estructura de carpetas de este proyecto con placeholders para: Skills (cada uno con su SKILL.md), agentes y archivos de contexto del producto. Explica en una línea para qué sirve cada carpeta.'),
('Ejemplo del curso','Buscar problemas en el código','M3 · Tech PM','Revisa este código como si fueras un tech lead explicándoselo a un PM no técnico. Señala acoplamiento alto, lógica duplicada o condicionales anidados, y propón cómo simplificarlo. No reescribas todo: prioriza los 3 cambios con más impacto.

[pega el código]'),
('Ejemplo del curso','Decidir entre precision y recall','M3 · Tech PM','Mi producto usa un clasificador para [caso, p. ej. predecir churn]. Explícame qué cuesta un falso positivo y qué cuesta un falso negativo en este caso, y recomiéndame si priorizar precision o recall como decisión de producto.'),
('Ejemplo del curso','Montar un dataset de evaluación','M3 · Tech PM','Ayúdame a crear un dataset de evaluación para [mi funcionalidad de IA]. Para cada caso dame: input (prompt), output esperado, metadata (categoría, dificultad, si es edge case) y criterios de evaluación. Empieza con 10 casos, incluyendo al menos 3 edge cases.');