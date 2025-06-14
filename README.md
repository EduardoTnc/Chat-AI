# Sistema Chat-AI – Presentación Técnica

> **Versión:** 0.1 · **Fecha:** 13-jun-2025  
> **Autor:** Eduardo Tnc · **Proyecto:** Plataforma de pedidos con asistente de IA y atención humana

---

![Chat-AI Interface](assets/image_1.png)


## 1. Resumen General
El proyecto **Chat-IA** es una mejora del proyecto **Restaurant Delivery AI** que integra:

* **Aplicación cliente** donde los usuarios pueden explorar el menú, comprar y chatear con un asistente de IA o con agentes humanos.
* **Aplicación de agentes** que permite a operadores humanos atender chats escalados.
* **Aplicación de administración** para gestionar catálogo, usuarios, órdenes, modelos de IA y llaves API.
* **Backend** Node.js que expone API REST y comunicación en tiempo real mediante Socket.IO, además de orquestar servicios de IA (OpenAI u Ollama).

El sistema está preparado para escalar conversaciones a un agente humano cuando la IA no resuelva la consulta o cuando el usuario lo solicite.

---

## 2. Tecnologías y Librerías Principales
| Capa | Tecnologías | Paquetes Destacados |
|------|-------------|----------------------|
| **Backend** | Node.js 20 · Express 5 · Socket.IO 4 · MongoDB/Mongoose 8 | `openai`, `socket.io`, `dotenv`, `jsonwebtoken`, `multer`, `jest`, `supertest` |
| **Cliente web** | React 19 · Vite 6 · TailwindCSS 4 | `axios`, `socket.io-client`, `react-router-dom`, `react-toastify`, `framer-motion` |
| **Agente** | React 19 + TypeScript · Zustand | `socket.io-client`, `zustand` |
| **Admin** | React 19 + TypeScript · Shadcn UI · Radix UI | `axios`, `zustand`, `@radix-ui/*`, `lucide-react`, `tailwind-merge` |
| **Pruebas** | Jest 30 · Supertest · mongodb-memory-server |

---

## 3. Backend
### 3.1 Servidor Express
* **Archivo de entrada:** `server/server.js` – configura Express, CORS, conexión a MongoDB y Socket.IO.
* **Rutas REST** en `server/routes/*` mapean a **controladores** en `server/controllers/*`.
* **Autenticación:** JWT, gestionada por `authMiddleware.js` (HTTP) y `socketAuthMiddleware.js` (WebSocket).
* **Subidas de archivos:** `multer` para imágenes de menú.

### 3.2 Módulo Chat & IA (`server/chat-module`)
* **services/AIService.js**  
  Gestiona llamadas a modelos de IA, define **tool calls** (`search_menu_items`, `escalate_to_human_agent`) y maneja la lógica de conversación.
* **services/MessageService.js**  
  CRUD de mensajes y conversaciones, verificación de permisos.
* **providers/**  
  Abstracción para **OpenAIProvider** y **OllamaProvider**.
* **socketHandlers/**  
  Lógica de eventos para usuarios, agentes y IA.

### 3.3 Modelos Mongoose
`User`, `Conversation`, `Message`, `MenuItem`, `Order`, `AIModelConfig`, `ApiKeyStore`.


---

## 4. Frontend Cliente (`frontend-cliente`)
* **Stack:** React 19, Vite, TailwindCSS, Context API.
* **Gestión de estado:** Contexts `AuthContext`, `ChatContext`, `TiendaContext`.
* **Socket.IO:** Hook `ChatSocket.js` gestiona mensajes, typing y eventos de IA.
* **Páginas principales:** Inicio, Tomar Orden, Carrito, Mis Órdenes, Chat.
* **Componentes de Chat:** Área de conversaciones, búsqueda de usuarios, chat con IA (`AIAssistantChat`).

---

## 5. Frontend Agente (`frontend-agent`)
* **Stack:** React 19 + TypeScript, Zustand para estado, Tailwind.
* **WebSocket:** Hook `useAgentSocket.ts` para cola y mensajes.
* **Componentes clave:** `ConversationQueue`, `MessageArea`, `ConversationDetails`.

---

## 6. Frontend Admin (`frontend-admin`)
* **Stack:** React 19 + TypeScript, Shadcn UI (Radix), Zustand.
* **Servicios API:** `aiModelService.ts`, `menuItemService.ts`, etc. usando Axios.
* **Gestión de modelos de IA y llaves API.**
* **Chat completo** para visualizar y moderar conversaciones (`FullChatPage.tsx`).

---

## 7. Flujo de Chat y Escalada
1. **Cliente envía mensaje** → evento `sendMessageToIA` por Socket.IO.  
2. **AISocketHandler** crea mensaje, llama a **AIService**.  
3. **AIService** decide:  
   * Responder directamente (`newMessageFromIA`).  
   * Ejecutar tool call `search_menu_items` → consulta BD y responde.  
   * Ejecutar `escalate_to_human_agent` → `MessageService.escalateConversationToAgent` notifica a agentes, UI muestra "Escalación en progreso".
4. **Agente** recibe conversación en cola y responde al usuario.

---

## 8. Documentación Completa Generada por DeepWiki

En [https://deepwiki.com/EduardoTnc/Chat-AI#chat-and-ai-service-flow](https://deepwiki.com/EduardoTnc/Chat-AI#chat-and-ai-service-flow) se encuentra más información sobre el flujo de chat y escalada, así como diagramas de PlantUML.


