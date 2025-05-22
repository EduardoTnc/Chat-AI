// jest.config.js
export default {
    // Configuración minimalista para Node.js con ESM
    testEnvironment: 'node',
    setupFilesAfterEnv: ['./jest.setup.js'],
    testTimeout: 60000, // Aumentado para tests con sockets
    verbose: true,
    // Para evitar problemas con mocks en ESM
    injectGlobals: true,
    // Especificar qué tests ejecutar para facilitar debugging
};