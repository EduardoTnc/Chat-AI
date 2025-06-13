import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    conversationId: { // El ID de la conversación
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true,
    },
    senderId: { // El ID del remitente
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function () { return ['user', 'agent'].includes(this.senderType); } // Requerido solo si es user o agent
    },
    senderType: { // El tipo de remitente
        type: String,
        enum: ['user', 'IA', 'agent', 'tool', 'systemNotification', 'system'],
        required: true,
    },
    receiverId: { // Puede ser null si el receptor es la IA
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    receiverType: { // Para identificar si el mensaje va a un usuario, IA, o agente
        type: String,
        enum: ['user', 'IA', 'agent'],
    },
    content: { // El contenido del mensaje
        type: String,
        required: function () {
            return !(this.senderType === 'IA' && this.toolCalls && this.toolCalls.length > 0);
        },
        trim: true,
        default: ''
    },
    type: { // El tipo de mensaje
        type: String,
        enum: ['userQuery', 'IAResponse', 'userMessage', 'agentMessage', 'IAEscalationSignal', 'toolResult', 'systemNotification'],
        required: true,
    },
    modelId: { // Para mensajes de/para IA, identifica el modelo usado
        type: String,
    },
    read: { // Si el mensaje ha sido leído
        type: Boolean,
        default: false,
    },
    readBy: [{ // Quién ha leído este mensaje
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    timestamp: { // Mongoose añade `createdAt` y `updatedAt` por defecto con `timestamps: true`
        type: Date,    // es útil tener un `timestamp` específico para el mensaje si hay retrasos
        default: Date.now,
        index: true,
    },
    usage: { // Para OpenAI o similares, para rastrear costos
        promptTokens: Number,
        completionTokens: Number,
        totalTokens: Number,
    },
    toolCallId: { // Si este mensaje es una respuesta a una llamada de herramienta de la IA
        type: String,
    },
    toolCalls: [{ // Si este mensaje de la IA incluye llamadas a herramientas/funciones
        id: String, // ID de la llamada, ej. de OpenAI
        type: { type: String, default: 'function' }, // OpenAI usa 'function'
        function: {
            name: String,
            arguments: String, // Los argumentos como un JSON string
        }
    }],
    isError: { // Si un 'toolResult' fue un error
        type: Boolean,
        default: false,
    },
    // Podría añadir 'metadata' para información extra, como archivos adjuntos, etc.
    // metadata: {
    //    attachments: [{ fileName: String, url: String, mimeType: String }]
    // }
}, { timestamps: true }); // Esto añade createdAt y updatedAt automáticamente

const Message = mongoose.model('Message', messageSchema);

export default Message;