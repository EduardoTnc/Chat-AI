const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const ModelKeyService = require('../services/ModelKeyService');
const AIModelConfig = require('../models/AIModelConfig');
const ApiKeyStore = require('../models/ApiKeyStore');

// Mock the mongoose connection
let mongoServer;

beforeAll(async () => {
  // Create a new in-memory database before running any tests
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  // Disconnect from the in-memory database after all tests are done
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all test data after each test
  await AIModelConfig.deleteMany({});
  await ApiKeyStore.deleteMany({});
});

describe('ModelKeyService', () => {
  describe('associateModelWithKey', () => {
    it('should associate a model with an API key', async () => {
      // Create a test API key
      const apiKey = await ApiKeyStore.create({
        provider: 'openai',
        apiKey: 'test-api-key',
        description: 'Test API Key'
      });

      // Create a test model
      const model = await AIModelConfig.create({
        name: 'Test Model',
        provider: 'openai',
        modelId: 'test-model',
        apiIdentifier: 'test-model',
        systemPrompt: 'Test system prompt',
        isVisibleToClient: true,
        allowedRoles: ['user'],
        supportsTools: false,
        isActive: true,
        description: 'Test model',
        isDefault: false
      });

      // Associate the model with the API key
      await ModelKeyService.associateModelWithKey(model._id, apiKey._id);

      // Verify the association
      const updatedModel = await AIModelConfig.findById(model._id);
      const updatedKey = await ApiKeyStore.findById(apiKey._id);

      expect(updatedModel.apiKeyRef.toString()).toBe(apiKey._id.toString());
      expect(updatedKey.usedByModels.map(id => id.toString())).toContain(model._id.toString());
    });

    it('should update the association when a model is associated with a different key', async () => {
      // Create two test API keys
      const apiKey1 = await ApiKeyStore.create({
        provider: 'openai',
        apiKey: 'test-api-key-1',
        description: 'Test API Key 1'
      });

      const apiKey2 = await ApiKeyStore.create({
        provider: 'openai',
        apiKey: 'test-api-key-2',
        description: 'Test API Key 2'
      });

      // Create a test model
      const model = await AIModelConfig.create({
        name: 'Test Model',
        provider: 'openai',
        modelId: 'test-model',
        apiIdentifier: 'test-model',
        systemPrompt: 'Test system prompt',
        isVisibleToClient: true,
        allowedRoles: ['user'],
        supportsTools: false,
        isActive: true,
        description: 'Test model',
        isDefault: false,
        apiKeyRef: apiKey1._id
      });

      // Update the API key reference
      await ModelKeyService.associateModelWithKey(model._id, apiKey2._id);

      // Verify the association was updated
      const updatedModel = await AIModelConfig.findById(model._id);
      const updatedKey1 = await ApiKeyStore.findById(apiKey1._id);
      const updatedKey2 = await ApiKeyStore.findById(apiKey2._id);

      expect(updatedModel.apiKeyRef.toString()).toBe(apiKey2._id.toString());
      expect(updatedKey1.usedByModels.map(id => id.toString())).not.toContain(model._id.toString());
      expect(updatedKey2.usedByModels.map(id => id.toString())).toContain(model._id.toString());
    });
  });

  describe('disassociateModelFromKey', () => {
    it('should disassociate a model from its API key', async () => {
      // Create a test API key
      const apiKey = await ApiKeyStore.create({
        provider: 'openai',
        apiKey: 'test-api-key',
        description: 'Test API Key'
      });

      // Create a test model associated with the API key
      const model = await AIModelConfig.create({
        name: 'Test Model',
        provider: 'openai',
        modelId: 'test-model',
        apiIdentifier: 'test-model',
        systemPrompt: 'Test system prompt',
        isVisibleToClient: true,
        allowedRoles: ['user'],
        supportsTools: false,
        isActive: true,
        description: 'Test model',
        isDefault: false,
        apiKeyRef: apiKey._id
      });

      // Disassociate the model from the API key
      await ModelKeyService.disassociateModelFromKey(model._id);

      // Verify the disassociation
      const updatedModel = await AIModelConfig.findById(model._id);
      const updatedKey = await ApiKeyStore.findById(apiKey._id);

      expect(updatedModel.apiKeyRef).toBeUndefined();
      expect(updatedKey.usedByModels.map(id => id.toString())).not.toContain(model._id.toString());
    });
  });

  describe('getApiKeyForModel', () => {
    it('should return the API key for a model', async () => {
      // Create a test API key
      const apiKey = await ApiKeyStore.create({
        provider: 'openai',
        apiKey: 'test-api-key',
        description: 'Test API Key'
      });

      // Create a test model associated with the API key
      const model = await AIModelConfig.create({
        name: 'Test Model',
        provider: 'openai',
        modelId: 'test-model',
        apiIdentifier: 'test-model',
        systemPrompt: 'Test system prompt',
        isVisibleToClient: true,
        allowedRoles: ['user'],
        supportsTools: false,
        isActive: true,
        description: 'Test model',
        isDefault: false,
        apiKeyRef: apiKey._id
      });

      // Get the API key for the model
      const result = await ModelKeyService.getApiKeyForModel(model._id);

      // Verify the result
      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(apiKey._id.toString());
      expect(result.apiKey).toBe(apiKey.apiKey);
    });

    it('should return null if the model does not have an associated API key', async () => {
      // Create a test model without an API key
      const model = await AIModelConfig.create({
        name: 'Test Model',
        provider: 'custom',
        modelId: 'test-model',
        apiIdentifier: 'test-model',
        systemPrompt: 'Test system prompt',
        isVisibleToClient: true,
        allowedRoles: ['user'],
        supportsTools: false,
        isActive: true,
        description: 'Test model',
        isDefault: false
      });

      // Get the API key for the model
      const result = await ModelKeyService.getApiKeyForModel(model._id);

      // Verify the result
      expect(result).toBeNull();
    });
  });
});
