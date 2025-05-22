// server/models/Conversation.js

import mongoose from 'mongoose';

const unreadCountSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    count: {
        type: Number,
        default: 0,
        min: 0,
    }
}, { _id: false });

const pinnedSchema = new mongoose.Schema({
    userId: { // El admin/agent que lo fijó
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    pinnedAt: {
        type: Date,
        default: Date.now,
    }
}, { _id: false });

const escalationDetailsSchema = new mongoose.Schema({
    reason: { // Razón de la escalación (del tool_call o manual)
        type: String,
        trim: true,
    },
    urgency: { // Urgencia de la escalación
        type: String,
        enum: ['low', 'medium', 'high', null], // Permitir null si no se especifica
        default: null,
    },
    escalatedByTool: { // Si la escalación fue iniciada por una herramienta de IA
        type: Boolean,
        default: false,
    },
    escalationTimestamp: {
        type: Date,
    }
}, { _id: false });


const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }],
    type: {
        type: String,
        enum: ['user-to-user', 'user-to-ia', 'user-to-agent'],
        required: true,
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
    },
    status: {
        type: String,
        enum: ['active', 'pending_agent', 'agent_active', 'closed_by_agent', 'closed_by_user', 'archived'],
        default: 'active',
    },
    agentId: { // Agente actualmente asignado
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    modelId: { // Modelo de IA usado
        type: String,
    },
    unreadCounts: [unreadCountSchema],
    metadata: {
        title: { // Título personalizado (ej. por un agente)
            type: String,
            trim: true,
        },
        pinnedBy: [pinnedSchema], // Quiénes (admins/agents) han fijado esta conversación
        escalationDetails: escalationDetailsSchema, // Detalles si la conversación fue escalada
        // Otros campos sugeridos:
        tags: [{ // Para categorizar conversaciones (ej. 'facturación', 'soporte_tecnico')
            type: String,
            trim: true,
            lowercase: true,
        }],
        priority: { // Prioridad asignada por un agente/admin
            type: String,
            enum: ['low', 'normal', 'high', 'urgent', null],
            default: 'normal',
        },
        notes: [{ // Notas internas de agentes/admins sobre la conversación
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            note: String,
            createdAt: { type: Date, default: Date.now }
        }],
        clientInfo: { // Información contextual del cliente si es relevante (ej. desde qué página inició el chat)
            device: String, // ej. 'desktop', 'mobile'
            browser: String,
            pageUrl: String,
        }
    },
}, { timestamps: true });

// Índices
conversationSchema.index({ type: 1, participants: 1 });
conversationSchema.index({ agentId: 1, status: 1 });
conversationSchema.index({ type: 1, modelId: 1, "participants.0": 1 });
conversationSchema.index({ status: 1, type: 1, "metadata.priority": 1 }); // Para buscar por prioridad
conversationSchema.index({ "metadata.tags": 1 }); // Para buscar por tags

// Métodos (updateUnreadCount se mantiene igual)
conversationSchema.methods.updateUnreadCount = function(recipientId, increment = true) {
    // ... (sin cambios)
    const unreadEntry = this.unreadCounts.find(uc => uc.userId.equals(recipientId));
    if (unreadEntry) {
        unreadEntry.count = increment ? (unreadEntry.count || 0) + 1 : 0;
        if (unreadEntry.count < 0) unreadEntry.count = 0;
    } else if (increment) {
        this.unreadCounts.push({ userId: recipientId, count: 1 });
    }
};

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;