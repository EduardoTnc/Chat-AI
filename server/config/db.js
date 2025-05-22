// server/config/db.js
import mongoose from "mongoose";
import configLocal from './index.js'; // Para la URI normal

// Quitar import y uso de dns para simplificar en tests
// import dns from "node:dns/promises";
// dns.setServers(["1.1.1.1"]);

export const connectDB = async () => {
  try {
    const dbUriToUse = process.env.NODE_ENV === 'test'
      ? process.env.MONGODB_URI_FOR_JEST // Prioridad si está en test y definida
      : configLocal.mongodbUri;

    if (!dbUriToUse) {
      const errorMessage = `MongoDB URI no definida. (NODE_ENV: ${process.env.NODE_ENV}, MONGODB_URI_FOR_JEST: ${process.env.MONGODB_URI_FOR_JEST}, config.mongodbUri: ${configLocal.mongodbUri})`;
      console.error("FATAL ERROR:", errorMessage);
      if (process.env.NODE_ENV !== 'test') process.exit(1);
      throw new Error(errorMessage); // Lanzar para que Jest lo capture
    }

    if (mongoose.connection.readyState === 0) {
      console.log(`Intentando conectar a MongoDB en: ${dbUriToUse} (Entorno: ${process.env.NODE_ENV})`);
      const conn = await mongoose.connect(dbUriToUse, {
        serverSelectionTimeoutMS: process.env.NODE_ENV === 'test' ? 60000 : 5000, // Aumentar más
        connectTimeoutMS: process.env.NODE_ENV === 'test' ? 60000 : 10000,
      });
      if (process.env.NODE_ENV !== 'test') {
        console.log(`MongoDB conectado: ${conn.connection.host}`);
      } else {
        console.log(`MongoDB (test) conectado a In-Memory Server: ${conn.connection.host}`);
      }
    } else {
      if (process.env.NODE_ENV === 'test' && mongoose.connection.client.s.url !== dbUriToUse) {
        console.warn(`ADVERTENCIA: Mongoose ya estaba conectado a ${mongoose.connection.client.s.url} pero se esperaba ${dbUriToUse}. Intentando reconectar...`);
        await mongoose.disconnect();
        const conn = await mongoose.connect(dbUriToUse);
        console.log(`MongoDB (test) RE-conectado a In-Memory Server: ${conn.connection.host}`);
      } else if (process.env.NODE_ENV !== 'test') {
        console.log("MongoDB ya conectado, omitiendo reconexión.");
      }
    }

  } catch (error) {
    console.error(`Error al conectar/configurar MongoDB (${process.env.NODE_ENV} env): ${error.message}`, error.stack);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error; // Relanzar para que el test/setup falle
  }
}