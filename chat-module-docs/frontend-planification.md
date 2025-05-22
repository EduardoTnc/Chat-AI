**Análisis de Propuestas para el Frontend:**

**Primero: Frontend del Cliente (Reutilización de Base Existente)**

*   **Tu Idea:** Reutilizar un proyecto React existente que ya tiene:
    *   Modal de Login/Registro.
    *   Navbar en la Homepage.
    *   Implementación base de chat `user_to_user` y `user_to_ia`.
*   **Ventajas:**
    *   **Ahorro de Tiempo Significativo:** No partes de cero en componentes UI comunes ni en la lógica básica del chat.
    *   **Consistencia Visual:** Si el proyecto base ya tiene un estilo definido, es más fácil mantener la coherencia.
    *   **Enfoque en Nuevas Funcionalidades:** Puedes concentrarte en integrar las características avanzadas de tu backend (metadata, escalación, etc.) en lugar de construir la estructura básica.
*   **Desafíos/Consideraciones:**
    *   **Adaptabilidad del Código Existente:** ¿Qué tan fácil será modificar el `ChatContext`, los componentes de chat ( `ConversationList`, `ChatArea`, `MessageItem`), y los servicios API del frontend existentes para acomodar:
        *   Nuevos tipos de mensajes (sistema, tool_call, tool_result).
        *   Nuevos estados de conversación (pending_agent, agent_active, closed).
        *   Interacción con el nuevo `AIService` y sus flujos (tool calling, escalación).
        *   La obtención y muestra de `metadata` de conversación.
        *   Manejo de múltiples modelos de IA.
    *   **Gestión de Estado:** Asegúrate de que el `ChatContext` (o cualquier otra solución de gestión de estado global como Redux/Zustand si la usas) sea lo suficientemente flexible.
    *   **API Endpoints:** Deberás actualizar las llamadas API en el frontend para que coincidan con los nuevos endpoints del backend (ej. `/chat-api`, `/ai-api`, y los nuevos formatos de payload/response).
    *   **Eventos de Socket.IO:** El cliente de socket deberá escuchar y emitir los nuevos eventos que hemos definido (ej. `agentJoinedChat`, `escalationInProgress`, `conversationStatusChanged`, `conversationMetadataUpdated`).

**Segundo: Frontend del Admin/Agent (Desarrollo Rápido y Eficiente)**

*   **Tu Idea:**
    *   Usar React.js para mantener la consistencia del stack.
    *   Utilizar herramientas para agilizar el desarrollo.
    *   Priorizar la implementación completa de las funcionalidades del backend.
*   **Ventajas:**
    *   **React:** Aprovechas el conocimiento existente y la posibilidad de compartir algunos componentes o lógica si fuera necesario (aunque generalmente el panel de admin es bastante independiente).
    *   **Enfoque en Funcionalidad:** Correcto, para un panel interno, la funcionalidad prima sobre un diseño hiper-pulido inicialmente.
*   **Herramientas para Agilizar:**
    *   **UI Libraries/Component Kits:**
        *   **Material-UI (MUI):** Muy completo, gran cantidad de componentes listos para usar, buena documentación. Ideal para construir interfaces de admin rápidamente.
        *   **Ant Design (AntD):** Otra excelente opción, popular para aplicaciones empresariales y paneles de admin.
        *   **Chakra UI:** Enfocada en accesibilidad y experiencia de desarrollador, muy personalizable.
        *   **Tailwind CSS (con componentes pre-hechos):** Si ya usas Tailwind en el proyecto base del cliente, puedes usar librerías de componentes basadas en Tailwind como DaisyUI, Flowbite, o Headless UI (combinado con Tailwind) para construir rápidamente la UI del admin. Esto mantendría la consistencia en el uso de Tailwind.
    *   **Plantillas de Admin:** Hay muchas plantillas de admin (gratuitas y de pago) construidas con React y alguna de las UI libraries mencionadas. Pueden darte una estructura inicial, layouts, y páginas comunes (tablas, formularios, dashboards). Ejemplos: Create React Admin (basado en MUI, pero tiene su propia forma de hacer las cosas), plantillas de ThemeForest, etc.
    *   **React Table (TanStack Table):** Si necesitas tablas de datos complejas con ordenamiento, filtrado, paginación.
    *   **React Hook Form / Formik:** Para manejar formularios complejos de manera eficiente.
*   **Desafíos/Consideraciones:**
    *   **Curva de Aprendizaje de Herramientas:** Si eliges una UI library o plantilla nueva, habrá una pequeña curva de aprendizaje.
    *   **Autenticación y Autorización:** El panel de admin necesitará su propio flujo de login (usando el mismo backend de auth) y deberá proteger rutas/funcionalidades basadas en los roles 'agent' y 'admin'.
    *   **Interfaz de Chat para Agentes:** Esta será una parte crucial y compleja. Deberá permitir a los agentes:
        *   Ver colas de chats (pendientes, asignados).
        *   Tomar chats.
        *   Chatear con clientes (enviar/recibir mensajes, ver historial).
        *   Usar herramientas de moderación/gestión (cerrar chat, transferir - si se implementa, añadir notas, ver metadata).
    *   **Visualización de Datos:** Mostrar todas las conversaciones, configuraciones de IA, API keys, y reportes de costos de forma clara.

---

**Plan de Desarrollo del Frontend (Propuesta Detallada):**

Vamos a dividirlo en fases y módulos, considerando tus prioridades.

**FASE 1: Integración y Adecuación del Chat del Cliente**

*   **Objetivo:** Adaptar la base existente del chat del cliente para que funcione con el nuevo backend y las funcionalidades básicas.
*   **Módulos/Tareas:**
    1.  **`ChatContext.jsx` (Cliente):**
        *   **Conexión Socket.IO:** Actualizar para usar la nueva URL del backend y el envío del `token` en `auth` como lo tienes.
        *   **Eventos de Socket:**
            *   Revisar y adaptar los listeners existentes (`newMessage`, `messageSent`, etc.) a los payloads del nuevo backend.
            *   Añadir listeners para: `userMessageToIASent`, `newMessageFromIA`, `escalationInProgress`, `agentJoinedChat`, `conversationClosed`, `messageRead` (para el doble check).
            *   Revisar los eventos emitidos (`sendMessageToUser`, `sendMessageToIA`, `markMessageAsRead`, `typing`) para asegurar que los payloads son correctos.
        *   **Estado:**
            *   `conversations`: Adaptar cómo se obtienen y actualizan.
            *   `currentChat`: Asegurar que maneja bien el cambio entre chat de usuario y chat de IA.
            *   `messages`: Que pueda manejar los diferentes tipos de mensajes (user, agent, IA, system, tool_result si decides mostrarlo).
            *   `aiModels`: Nuevo estado para los modelos de IA disponibles.
            *   `selectedAIModel`: Estado para el modelo de IA seleccionado.
    2.  **Servicios API (Cliente - `axios` calls):**
        *   Actualizar URL base (`urlApi`).
        *   Modificar `getConversationList` para llamar a `/api/v1/chat-api/` (o la nueva ruta de tus conversaciones de usuario).
        *   Modificar `getMessages` para llamar a `/api/v1/chat-api/:conversationId/messages`.
        *   Añadir función para `markConversationAsRead` llamando al endpoint POST correspondiente.
        *   Añadir función para `getAvailableAIModels` llamando a `/api/v1/ai-api/models`.
        *   Añadir función para `getAIConversationHistory` llamando a `/api/v1/ai-api/conversations/:conversationId/messages`.
    3.  **Componentes de Chat (Cliente):**
        *   **`ConversationList.jsx`:**
            *   Integrar el botón y la lógica para `startAIChat` (ya lo tienes).
            *   Asegurar que la lista de conversaciones se actualiza correctamente con nuevos mensajes o cambios de estado (vía `ChatContext`).
            *   Mostrar correctamente el `unreadCount`.
        *   **`ChatArea.jsx` (para chat user-to-user y user-to-agent):**
            *   Mostrar mensajes de usuarios y agentes.
            *   Mostrar indicador "Agente X se ha unido".
            *   Deshabilitar input si la conversación está cerrada.
        *   **`AIAssistantChat.jsx`:**
            *   **Selector de Modelos:** Ya lo tienes, conectar con `availableModels` y `selectedAIModel` del `ChatContext`.
            *   **Envío de Mensajes:** Adaptar `handleSendMessage` para usar el evento de socket `sendMessageToIA` con el `modelId` correcto, `conversationId` (si existe), y `clientInfo`.
            *   **Recepción de Mensajes:** Manejar `newMessageFromIA` y `escalationInProgress`. Si `isError` es true en el mensaje de IA, mostrarlo adecuadamente.
            *   **Historial:** Cargar historial usando la nueva función del servicio API.
        *   **`MessageItem.jsx`:**
            *   Adaptar para renderizar diferentes tipos de mensajes (user, agent, IA, system, tool_result si es visible) con estilos distintos.
            *   Mostrar checks de lectura basados en `message.readBy` (si decides implementar esa granularidad visual).
        *   **`FloatingChatButton.jsx`:**
            *   Asegurar que `unreadCount` se calcula correctamente desde `ChatContext.conversations`.
            *   La lógica de abrir el panel de chat o el chat de IA parece bien.
    4.  **Autenticación (Cliente - `LoginPopup.jsx` y `Navbar.jsx`):**
        *   Asegurar que el login/registro usa los endpoints `/api/v1/auth/login` y `/api/v1/auth/register`.
        *   Manejar el `accessToken` y el `refreshToken` (el refresh token se maneja automáticamente por la cookie HTTPOnly).
        *   Implementar la lógica para llamar al endpoint `/api/v1/auth/refresh-token` cuando el `accessToken` expire (esto se hace típicamente en un interceptor de Axios).
        *   El logout en `Navbar.jsx` debe llamar al endpoint `/api/v1/auth/logout` del backend.

**FASE 2: Desarrollo del Panel de Admin/Agent (Enfoque Rápido)**

*   **Objetivo:** Construir una interfaz funcional para que los administradores y agentes gestionen el sistema y los chats.
*   **Tecnología Sugerida:** React + **Material-UI (MUI)** o **Ant Design (AntD)**. Ambas ofrecen una gran cantidad de componentes listos y son excelentes para paneles. Si prefieres Tailwind, considera **DaisyUI** o **Flowbite (React)**.
*   **Estructura General del Panel:**
    *   Layout principal (Sidebar de navegación, Header, Área de contenido).
    *   Rutas protegidas (`<ProtectedRoute role={['admin', 'agent']}> ... </ProtectedRoute>`).
    *   Contexto de Autenticación para el panel.
    *   Servicios API específicos para el panel de admin (`adminApiService.js`).

*   **Módulos/Tareas (Priorizados):**

    1.  **Autenticación del Panel:**
        *   Página de Login para Admin/Agent (usando `/api/v1/auth/login`).
        *   Manejo de tokens y protección de rutas.
    2.  **Dashboard Básico (Agente/Admin):**
        *   Mostrar estadísticas simples (ej. chats pendientes, chats activos).
    3.  **Gestión de Chats Escalados (Agente/Admin):**
        *   **Vista de Cola `pending_agent`:**
            *   Tabla/Lista de chats con `status: 'pending_agent'` (obtenidos de `/api/v1/admin-api/escalated-chats`).
            *   Mostrar info relevante (ID de conversación, usuario, `metadata.escalationDetails.reason`, `urgency`, `timestamp`).
            *   Botón "Tomar Chat" -> emite `agentPickChat` vía socket.
        *   **Vista de "Mis Chats Asignados" (Agente):**
            *   Lista de conversaciones donde `agentId` es el del agente actual y `status` es `'agent_active'`.
    4.  **Interfaz de Chat para Agente:**
        *   Similar a `ChatArea.jsx` del cliente pero adaptada:
            *   Input para enviar mensajes (`agentSendMessageToUser`).
            *   Visualización de mensajes (user, agent, system).
            *   Información del cliente y de la conversación (incluyendo `metadata` relevante).
            *   Acciones:
                *   Botón "Cerrar Conversación" (`agentCloseConversation`).
                *   Formulario para añadir notas (`agentAddNote`).
                *   Opciones para actualizar título, tags, prioridad (`agentUpdateConversationMetadata`).
                *   Botón para Fijar/Desfijar (`agentPinConversation`).
    5.  **Gestión de Configuración de IA (Admin):**
        *   **Modelos de IA:**
            *   Tabla para listar modelos (`AIModelConfig`) desde `/api/v1/admin-api/ai-models`.
            *   Formulario para Crear/Editar `AIModelConfig` (campos: `modelId`, `provider`, `name`, `apiIdentifier`, `systemPrompt`, `isVisibleToClient`, `allowedRoles`, `supportsTools`, etc.).
            *   Botón para Eliminar.
        *   **API Keys:**
            *   Tabla para listar `ApiKeyStore` (mostrando `provider`, `description`, `lastUpdated`).
            *   Formulario para Añadir/Actualizar API Key (campos: `provider`, `apiKey` (input de contraseña), `description`).
            *   Botón para Eliminar.
    6.  **Visualización de Todas las Conversaciones (Admin):**
        *   Tabla paginada y con filtros (por usuario, agente, tipo, estado, tags, etc.) para todas las conversaciones (usando `/api/v1/admin-api/conversations`).
        *   Opción para ver el historial de mensajes de cualquier conversación.
        *   Acciones rápidas (asignar agente, cambiar estado, etc.).
    7.  **Funcionalidades Avanzadas (Posteriores si el tiempo apremia):**
        *   Gestión de Roles de Usuarios.
        *   Reporte de Costos de IA (si la lógica del backend se completa).
        *   Logs del Sistema.

*   **Implementación del Socket para el Panel de Admin/Agent:**
    *   Un `AdminChatContext` o similar que maneje la conexión de socket para el admin/agent.
    *   Escuchar eventos como `newEscalatedChat`, `chatAssigned`, `newMessageInSharedConversation`, `conversationStatusChanged`, `conversationMetadataUpdated`.
    *   Emitir eventos como `agentPickChat`, `agentSendMessageToUser`, etc.

**Flujo de Desarrollo Frontend Sugerido:**

1.  **Cliente - Setup Inicial:**
    *   Asegurar que la conexión base al backend (login, registro) funciona con los nuevos endpoints.
    *   Establecer el `ChatContext` y la conexión básica de Socket.IO.
2.  **Cliente - Chat User-to-User Básico:**
    *   Adaptar el envío y recepción de mensajes entre usuarios.
    *   Listar conversaciones.
3.  **Cliente - Chat con IA Básico (sin tools inicialmente):**
    *   Listar modelos de IA.
    *   Enviar mensaje a IA y recibir respuesta simple.
4.  **Admin/Agent - Autenticación y Layout Básico:**
    *   Página de login.
    *   Layout con navegación.
5.  **Admin/Agent - Cola de Chats Escalados y Toma de Chat:**
    *   Agente puede ver chats en `pending_agent`.
    *   Agente puede tomar un chat (`agentPickChat`).
6.  **Admin/Agent - Interfaz de Chat del Agente:**
    *   Agente puede enviar mensajes al cliente.
    *   Cliente recibe mensajes del agente.
7.  **Cliente - Integración de Escalación a Agente:**
    *   Usuario puede usar la tool de IA para escalar.
    *   Frontend del cliente maneja `escalationInProgress` y `agentJoinedChat`.
8.  **Admin - Gestión de Configuración de IA:**
    *   CRUD para Modelos de IA.
    *   CRUD para API Keys.
9.  **Admin/Agent - Funcionalidades de Metadata en Chat:**
    *   Permitir a agentes/admins actualizar título, tags, prioridad, añadir notas, fijar.
10. **Refinamientos y Funcionalidades Avanzadas:**
    *   Reporte de costos, gestión de usuarios, etc.
    *   Mejoras UI/UX.

**Consideraciones sobre los archivos que me pasaste:**

*   **`ChatContext.jsx`:** Este es el corazón de tu chat de cliente. Gran parte de la adaptación se centrará aquí. Necesitarás:
    *   Separar la lógica de chat con IA de la de chat con usuario si `currentChat` es un objeto de usuario o un identificador de "IA". La variable `showingAIChat` ayuda.
    *   Actualizar los endpoints de Axios a los nuevos (ej. `/api/v1/chat-api/conversations` en lugar de `/api/messages/conversations`).
    *   Adaptar los eventos de socket:
        *   `sendMessage` (actual) probablemente es para `user-to-user`. Necesitarás `sendMessageToIA`.
        *   `markAsRead` (actual) parece ser para mensajes individuales. Asegúrate que el payload y el evento coincidan con el backend.
        *   `onlineUsers`, `userStatus`, `userTyping`, `userStopTyping`: Asegúrate que el backend los implementa y emite.
*   **`AIAssistantChat.jsx`:**
    *   Correcto en usar Axios para `/api/ai-assistant/conversation` y `/models` (que ahora serán `/api/v1/ai-api/...`).
    *   El `POST /api/ai-assistant/send` deberá cambiarse para emitir el evento de socket `sendMessageToIA` y manejar las respuestas (`newMessageFromIA`, `userMessageToIASent`, `escalationInProgress`) vía socket.
*   **`LoginPopup.jsx` y `Navbar.jsx`:** Correcto en llamar a los endpoints de autenticación.