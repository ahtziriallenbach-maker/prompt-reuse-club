# Registro, login y landing pública

## Qué verá la gente
- **Landing pública (/)**: explica el problema (los buenos prompts se pierden en notas sueltas) y lo que ofrece la web: banco de prompts y skills por módulo, copiar con un clic, reusos medidos y gestión de tus aportaciones. Botones «Crear cuenta» y «Entrar».
- **Página de acceso (/auth)**: pestañas Registro (nombre, email, contraseña) y Entrar (email, contraseña), más «¿Olvidaste tu contraseña?» y página para elegir una nueva.
- **Banco (/banco)**: solo con sesión iniciada. Igual que ahora, pero el nombre sale del perfil (desaparece la pantalla «¿Cómo te llamas?») y hay botón «Cerrar sesión». Al entrar, la landing lleva directo al banco.
- **Editar y borrar**: el autor puede gestionar sus recursos nuevos desde cualquier dispositivo. Los recursos antiguos siguen visibles pero no se pueden reclamar.
- «Mis aportaciones» muestra los recursos de tu cuenta.

## Detalles técnicos
- Activar email/contraseña en el backend; confirmación de email activa (mensaje «revisa tu correo»).
- Tabla `profiles` (id → usuario, display_name) con trigger que la crea al registrarse usando el nombre del formulario; RLS: lectura para autenticados, edición solo propia.
- Añadir `owner_id uuid` nullable a `prompts`. Lectura de `prompts` y `prompt_copies` solo para `authenticated` (retirar acceso anónimo). Copias guardan `copier` desde el perfil.
- Server functions de crear/editar/borrar/descargar pasan a `requireSupabaseAuth`; propiedad = `owner_id = userId`. Se retira la cookie de navegador para recursos nuevos (la tabla privada antigua queda sin uso y marcada como obsoleta).
- Rutas: `index.tsx` landing, `auth.tsx`, `reset-password.tsx`, `_authenticated/banco.tsx` (gate gestionado). Listener de sesión en `__root`.
- Actualizar pruebas de propiedad y la regla de reuso (comparar por cuenta cuando exista), y AGENTS.md/memoria.
