¡Excelente! Aquí tienes una guía completa y detallada sobre Jest para realizar pruebas unitarias y de integración en el stack MERN (MongoDB, Express, React, Node.js).

## Guía Completa de Pruebas con Jest para el Stack MERN

**Índice:**

1.  **Introducción a Jest**
    *   ¿Qué es Jest?
    *   ¿Por qué Jest para MERN?
    *   Tipos de Pruebas (Unitarias vs. Integración)
2.  **Configuración Inicial de Jest**
    *   Instalación
    *   Configuración básica (`jest.config.js` o `package.json`)
    *   Scripts en `package.json`
3.  **Conceptos Fundamentales de Jest**
    *   `describe()`, `it()`, `test()`
    *   `expect()` y Matchers (Aserciones)
    *   Setup y Teardown (`beforeEach`, `afterEach`, `beforeAll`, `afterAll`)
    *   Mocking y Spying (`jest.fn()`, `jest.spyOn()`, `jest.mock()`)
    *   Pruebas Asíncronas
4.  **Pruebas Unitarias en el Backend (Node.js/Express)**
    *   Estructura de Archivos
    *   Probar Funciones de Utilidad
    *   Probar Controladores (Route Handlers)
    *   Probar Servicios/Lógica de Negocio
    *   Mockear Modelos de MongoDB (Mongoose)
    *   Probar Middleware
5.  **Pruebas de Integración en el Backend (Node.js/Express)**
    *   Uso de `supertest`
    *   Probar Endpoints API (GET, POST, PUT, DELETE)
    *   Manejo de Base de Datos de Prueba
6.  **Pruebas Unitarias en el Frontend (React)**
    *   Introducción a React Testing Library (RTL)
    *   Probar Componentes (Renderizado, Props, Estado)
    *   Simular Eventos de Usuario (`fireEvent`)
    *   Probar Hooks Personalizados
    *   Mockear Llamadas API (`fetch`, `axios`)
    *   Probar Context API o Redux (conceptos)
7.  **Pruebas de Integración en el Frontend (React)**
    *   Probar Flujos de Usuario (Interacción entre componentes)
    *   Integración con APIs mockeadas
8.  **Temas Avanzados y Buenas Prácticas**
    *   Cobertura de Código (Code Coverage)
    *   Pruebas de Snapshot (con precaución)
    *   Organización de las Pruebas
    *   Pruebas en un Entorno de CI/CD
9.  **Conclusión**

---

### 1. Introducción a Jest

#### ¿Qué es Jest?
Jest es un framework de pruebas de JavaScript delicioso con un enfoque en la simplicidad. Fue creado por Facebook y es ampliamente utilizado para probar aplicaciones React, pero es lo suficientemente versátil para probar cualquier código JavaScript, incluyendo Node.js, Express y más.

#### ¿Por qué Jest para MERN?
*   **"Zero Configuration"**: Para muchos proyectos, Jest funciona sin necesidad de configuración.
*   **Velocidad**: Ejecuta pruebas en paralelo, optimizando el tiempo.
*   **API Intuitiva**: Sus funciones (`describe`, `it`, `expect`) son fáciles de entender.
*   **Mocking Integrado**: Facilita el aislamiento de unidades de código.
*   **Snapshots**: Útil para rastrear cambios en UIs o estructuras de datos grandes (usar con moderación).
*   **Cobertura de Código**: Genera informes de cobertura de forma nativa.
*   **Gran Comunidad y Soporte**: Ampliamente adoptado, especialmente en el ecosistema React.

#### Tipos de Pruebas
*   **Pruebas Unitarias**: Verifican la unidad más pequeña de código (una función, un componente React, un método de clase) de forma aislada. Las dependencias externas se suelen mockear.
*   **Pruebas de Integración**: Verifican cómo interactúan varias unidades/módulos. Por ejemplo, cómo un controlador de Express interactúa con un servicio y este (potencialmente) con una base de datos mockeada o real de prueba. O cómo varios componentes React interactúan entre sí.

---

### 2. Configuración Inicial de Jest

#### Instalación
```bash
# Para un proyecto Node.js/Express
npm install --save-dev jest
# O con yarn
yarn add --dev jest

# Para un proyecto React (si no usas Create React App, que ya lo incluye)
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
# O con yarn
yarn add --dev jest @testing-library/react @testing-library/jest-dom
```
Si usas Babel (común en Node.js moderno y React), necesitarás `babel-jest`:
```bash
npm install --save-dev babel-jest @babel/core @babel/preset-env
# Si usas React y JSX
npm install --save-dev @babel/preset-react
```
Crea un archivo `babel.config.js` (o `.babelrc`):
```javascript
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', {targets: {node: 'current'}}], // Para Node.js
    '@babel/preset-react' // Para React
  ],
};
```

#### Configuración básica (`jest.config.js` o `package.json`)
Puedes ejecutar `npx jest --init` para generar un archivo `jest.config.js` con opciones comentadas.

Un `jest.config.js` básico podría verse así:
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node', // Para backend. Para frontend, usar 'jsdom'
  // verbose: true, // Muestra reportes detallados de cada test
  // coverageDirectory: "coverage", // Directorio para reportes de cobertura
  // clearMocks: true, // Limpia mocks automáticamente entre cada test
  // moduleNameMapper: { ... }, // Para alias de módulos
  // setupFilesAfterEnv: ['./jest.setup.js'], // Archivos para ejecutar después del entorno de prueba
};
```
Para React, si no usas CRA, asegúrate de tener `testEnvironment: 'jsdom'`.
`setupFilesAfterEnv` es útil para importar `jest-dom` globalmente:
```javascript
// jest.setup.js (crea este archivo si lo necesitas)
import '@testing-library/jest-dom';
```

#### Scripts en `package.json`
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watchAll",
    "test:coverage": "jest --coverage"
  }
}
```

---

### 3. Conceptos Fundamentales de Jest

#### `describe()`, `it()`, `test()`
*   `describe(name, fn)`: Agrupa pruebas relacionadas. Es como una suite de pruebas.
*   `it(name, fn)` o `test(name, fn)`: Definen una prueba individual. `it` es un alias de `test`.

```javascript
// utils.test.js
const { sum } = require('./utils'); // Asumiendo que tienes un utils.js

describe('Utilidades de suma', () => {
  it('debería sumar dos números positivos correctamente', () => {
    expect(sum(2, 3)).toBe(5);
  });

  test('debería sumar un número positivo y cero', () => {
    expect(sum(7, 0)).toBe(7);
  });
});
```

#### `expect()` y Matchers (Aserciones)
`expect(value)` devuelve un objeto "expectation" que permite encadenar "matchers" para verificar el valor.
Matchers comunes:
*   `toBe(value)`: Compara igualdad estricta (`===`). Para primitivos.
*   `toEqual(value)`: Compara recursivamente todas las propiedades de objetos (igualdad profunda).
*   `toBeTruthy()`, `toBeFalsy()`
*   `toBeNull()`, `toBeUndefined()`, `toBeDefined()`
*   `toBeGreaterThan(number)`, `toBeLessThan(number)`
*   `toContain(item)`: Para arrays o strings.
*   `toMatch(regexpOrString)`: Para strings con expresiones regulares.
*   `toThrow(error?)`: Verifica si una función lanza un error.
*   `toHaveBeenCalled()`, `toHaveBeenCalledWith(...args)`: Para mocks.
*   Para React con `@testing-library/jest-dom`: `toBeInTheDocument()`, `toHaveTextContent()`, `toHaveAttribute()`, etc.

#### Setup y Teardown
Funciones para ejecutar código antes o después de las pruebas:
*   `beforeAll(fn)`: Se ejecuta una vez antes de todas las pruebas en el `describe` actual.
*   `afterAll(fn)`: Se ejecuta una vez después de todas las pruebas en el `describe` actual.
*   `beforeEach(fn)`: Se ejecuta antes de cada prueba (`it`/`test`) en el `describe` actual.
*   `afterEach(fn)`: Se ejecuta después de cada prueba (`it`/`test`) en el `describe` actual.

```javascript
describe('Mi Suite de Pruebas', () => {
  let db;

  beforeAll(() => {
    // Conectar a una base de datos de prueba, iniciar un servidor
    console.log('Antes de todas las pruebas');
  });

  afterAll(() => {
    // Desconectar de la base de datos, detener servidor
    console.log('Después de todas las pruebas');
  });

  beforeEach(() => {
    // Limpiar datos, resetear mocks
    console.log('Antes de cada prueba');
  });

  afterEach(() => {
    // Limpieza específica después de una prueba
    console.log('Después de cada prueba');
  });

  it('prueba 1', () => expect(true).toBe(true));
  it('prueba 2', () => expect(false).toBe(false));
});
```

#### Mocking y Spying
Esencial para aislar unidades de código.
*   `jest.fn(implementation?)`: Crea una función mock. Puede rastrear llamadas, parámetros, instancias y valores de retorno.
    ```javascript
    const mockCallback = jest.fn(x => 42 + x);
    mockCallback(1);
    expect(mockCallback).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith(1);
    expect(mockCallback.mock.results[0].value).toBe(43);
    ```
*   `jest.spyOn(object, methodName)`: Similar a `jest.fn` pero también "espía" un método existente en un objeto. Permite restaurar la implementación original con `mockRestore()`.
    ```javascript
    const utils = require('./utils');
    const sumSpy = jest.spyOn(utils, 'sum');
    utils.sum(1, 2);
    expect(sumSpy).toHaveBeenCalledWith(1, 2);
    sumSpy.mockRestore(); // Restaura la implementación original de utils.sum
    ```
*   `jest.mock(moduleName, factory?, options?)`: Mockea un módulo completo.
    *   **Mockeo automático**: `jest.mock('./miModulo')` reemplaza todas las exportaciones del módulo con funciones mock.
    *   **Mockeo manual (factory)**: Proporciona tu propia implementación para el módulo.
        ```javascript
        // __mocks__/fs.js (crea este archivo en un directorio __mocks__ adyacente a node_modules o al módulo)
        // O directamente en el archivo de prueba:
        jest.mock('fs', () => ({
          readFileSync: jest.fn(() => 'datos mockeados del archivo'),
        }));

        const fs = require('fs'); // ahora fs.readFileSync es el mock
        ```

#### Pruebas Asíncronas
Jest espera a que la promesa devuelta por la función de prueba se resuelva.
*   **Usando `async/await` (recomendado)**:
    ```javascript
    async function fetchData() {
      return new Promise(resolve => setTimeout(() => resolve('peanut butter'), 100));
    }

    it('debería devolver peanut butter', async () => {
      const data = await fetchData();
      expect(data).toBe('peanut butter');
    });
    ```
*   **Matchers `.resolves` / `.rejects`**:
    ```javascript
    it('debería resolver a peanut butter (con .resolves)', async () => {
      await expect(fetchData()).resolves.toBe('peanut butter');
    });

    async function fetchError() {
      return new Promise((resolve, reject) => setTimeout(() => reject(new Error('error')), 100));
    }

    it('debería rechazar con un error (con .rejects)', async () => {
      await expect(fetchError()).rejects.toThrow('error');
    });
    ```

---

### 4. Pruebas Unitarias en el Backend (Node.js/Express)

#### Estructura de Archivos
Es común colocar los archivos de prueba en un directorio `__tests__` dentro del directorio del módulo que estás probando, o nombrarlos con el sufijo `.test.js` o `.spec.js` junto al archivo fuente.

```
src/
├── controllers/
│   ├── userController.js
│   └── __tests__/
│       └── userController.test.js
├── services/
│   ├── userService.js
│   └── userService.test.js
├── models/
│   └── userModel.js
└── utils/
    ├── auth.js
    └── auth.test.js
```

#### Probar Funciones de Utilidad
Estas son las más sencillas. Simplemente importa la función y prueba sus entradas/salidas.

```javascript
// src/utils/calculator.js
const add = (a, b) => a + b;
const subtract = (a, b) => a - b;
module.exports = { add, subtract };

// src/utils/__tests__/calculator.test.js
const { add, subtract } = require('../calculator');

describe('Calculator Utils', () => {
  describe('add', () => {
    it('should return the sum of two numbers', () => {
      expect(add(2, 3)).toBe(5);
    });
  });

  describe('subtract', () => {
    it('should return the difference of two numbers', () => {
      expect(subtract(5, 2)).toBe(3);
    });
  });
});
```

#### Probar Controladores (Route Handlers)
Los controladores de Express toman `(req, res, next)`. Para probarlos unitariamente, mockea estos objetos.

```javascript
// src/controllers/userController.js
const UserService = require('../services/userService');

exports.getUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await UserService.findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    next(error); // Pasa el error al manejador de errores de Express
  }
};

// src/controllers/__tests__/userController.test.js
const { getUser } = require('../userController');
const UserService = require('../../services/userService');

// Mockear el servicio que usa el controlador
jest.mock('../../services/userService'); // Mockea automáticamente todas las funciones exportadas

describe('UserController - getUser', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      params: { id: '123' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(), // Permite encadenar .json()
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks(); // Limpia los mocks después de cada prueba
  });

  it('should return 404 if user is not found', async () => {
    UserService.findUserById.mockResolvedValue(null); // Simula que el servicio no encuentra el usuario

    await getUser(mockReq, mockRes, mockNext);

    expect(UserService.findUserById).toHaveBeenCalledWith('123');
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 200 and user data if user is found', async () => {
    const mockUser = { id: '123', name: 'Test User' };
    UserService.findUserById.mockResolvedValue(mockUser);

    await getUser(mockReq, mockRes, mockNext);

    expect(UserService.findUserById).toHaveBeenCalledWith('123');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(mockUser);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next with error if service throws an error', async () => {
    const MOCK_ERROR = new Error('Service Error');
    UserService.findUserById.mockRejectedValue(MOCK_ERROR);

    await getUser(mockReq, mockRes, mockNext);

    expect(UserService.findUserById).toHaveBeenCalledWith('123');
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(MOCK_ERROR);
  });
});
```

#### Probar Servicios/Lógica de Negocio
Los servicios contienen la lógica de negocio y a menudo interactúan con modelos de base de datos. Debes mockear estas interacciones.

```javascript
// src/services/userService.js
const User = require('../models/userModel'); // Modelo de Mongoose

async function findUserById(userId) {
  return User.findById(userId);
}

async function createUser(userData) {
  const user = new User(userData);
  return user.save();
}
module.exports = { findUserById, createUser };

// src/services/__tests__/userService.test.js
const { findUserById, createUser } = require('../userService');
const User = require('../../models/userModel');

// Mockear el modelo de Mongoose
jest.mock('../../models/userModel'); // Mockea User, User.findById, new User().save, etc.

describe('UserService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findUserById', () => {
    it('should call User.findById with the given id and return the user', async () => {
      const mockUser = { id: '123', name: 'Test' };
      User.findById.mockResolvedValue(mockUser); // Simula User.findById(...).exec() o .then()

      const user = await findUserById('123');

      expect(User.findById).toHaveBeenCalledWith('123');
      expect(user).toEqual(mockUser);
    });
  });

  describe('createUser', () => {
    it('should create and save a new user', async () => {
      const userData = { name: 'New User', email: 'new@example.com' };
      const savedUser = { _id: 'mockId', ...userData };

      // Mockear la instancia del modelo y su método save
      const mockUserInstance = { save: jest.fn().mockResolvedValue(savedUser) };
      User.mockImplementation(() => mockUserInstance); // `new User(userData)` devolverá `mockUserInstance`

      const result = await createUser(userData);

      expect(User).toHaveBeenCalledWith(userData);
      expect(mockUserInstance.save).toHaveBeenCalled();
      expect(result).toEqual(savedUser);
    });
  });
});
```

#### Mockear Modelos de MongoDB (Mongoose)
Como se vio arriba, `jest.mock('../../models/userModel')` es la forma más común. Esto mockea automáticamente el módulo `userModel`.
*   Para métodos estáticos como `User.findById`, `User.findOne`: `User.findById.mockResolvedValue(...)`.
*   Para métodos de instancia como `user.save()`:
    ```javascript
    const mockSave = jest.fn().mockResolvedValue(mockedSavedDocument);
    User.prototype.save = mockSave; // Opción 1 (menos común para mocks de módulo completo)

    // Opción 2 (preferida con jest.mock):
    // dentro del test, después de jest.mock('../../models/userModel');
    const mockUserInstance = { save: jest.fn().mockResolvedValue(savedUser) };
    User.mockImplementation(() => mockUserInstance); // Al hacer `new User()`, retorna la instancia mockeada
    // ...
    // await new User(data).save(); // esto llamará a mockUserInstance.save()
    ```

#### Probar Middleware
Similar a los controladores, mockea `req`, `res`, y `next`. Verifica si `next()` es llamado (o `next(error)`) o si se envía una respuesta.

```javascript
// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, 'SUPER_SECRET_KEY');
  } catch (err) {
    return res.status(401).json({ message: 'Token is not valid.' });
  }
  if (!decodedToken) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }
  req.userId = decodedToken.userId;
  next();
};

// src/middleware/__tests__/authMiddleware.test.js
const authMiddleware = require('../authMiddleware');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken'); // Mockear jwt

describe('Auth Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      get: jest.fn(),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should call next() if token is valid', () => {
    mockReq.get.mockReturnValue('Bearer validtoken');
    jwt.verify.mockReturnValue({ userId: '123' }); // Simula token válido

    authMiddleware(mockReq, mockRes, mockNext);

    expect(mockReq.get).toHaveBeenCalledWith('Authorization');
    expect(jwt.verify).toHaveBeenCalledWith('validtoken', 'SUPER_SECRET_KEY');
    expect(mockReq.userId).toBe('123');
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(); // Llamado sin argumentos
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return 401 if no Authorization header', () => {
    mockReq.get.mockReturnValue(null);

    authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Not authenticated.' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', () => {
    mockReq.get.mockReturnValue('Bearer invalidtoken');
    jwt.verify.mockImplementation(() => { throw new Error('Verification failed'); });

    authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token is not valid.' });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
```

---

### 5. Pruebas de Integración en el Backend (Node.js/Express)

Aquí probamos cómo las diferentes partes de tu aplicación Express (rutas, controladores, servicios) funcionan juntas. No mockearemos tanto como en las unitarias, pero podríamos mockear la capa de base de datos o usar una base de datos de prueba.

#### Uso de `supertest`
`supertest` es una librería popular para probar APIs HTTP. Permite hacer peticiones a tu app Express y verificar las respuestas.

```bash
npm install --save-dev supertest
```

#### Probar Endpoints API
```javascript
// server.js o app.js (tu aplicación Express)
const express = require('express');
const userRoutes = require('./src/routes/userRoutes'); // Asumiendo que tienes rutas de usuario
const app = express();

app.use(express.json());
app.use('/api/users', userRoutes);

// Manejador de errores global (opcional pero bueno para tests)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = app; // Exporta la app para supertest

// __tests__/integration/user.integration.test.js
const request = require('supertest');
const app = require('../../app'); // Tu app Express
const mongoose = require('mongoose');
const User = require('../../src/models/userModel'); // Tu modelo de Mongoose

// Conectar a una BD de prueba (MongoDB en memoria o una BD separada)
beforeAll(async () => {
  const MONGODB_URI_TEST = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/mern-jest-test';
  await mongoose.connect(MONGODB_URI_TEST, { useNewUrlParser: true, useUnifiedTopology: true });
});

// Limpiar la BD después de cada prueba
afterEach(async () => {
  await User.deleteMany({});
});

// Desconectar después de todas las pruebas
afterAll(async () => {
  await mongoose.connection.close();
});

describe('User API Endpoints', () => {
  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const newUser = { name: 'Test User', email: 'test@example.com', password: 'password123' };
      const res = await request(app)
        .post('/api/users')
        .send(newUser)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(res.body).toHaveProperty('_id');
      expect(res.body.name).toBe(newUser.name);
      expect(res.body.email).toBe(newUser.email);

      // Verificar que el usuario se guardó en la BD
      const dbUser = await User.findById(res.body._id);
      expect(dbUser).not.toBeNull();
      expect(dbUser.name).toBe(newUser.name);
    });

    it('should return 400 if email is missing', async () => {
      const newUser = { name: 'Test User', password: 'password123' };
      const res = await request(app)
        .post('/api/users')
        .send(newUser)
        .expect(400);
      // Aquí depende de cómo manejes la validación, podrías esperar un mensaje específico.
      expect(res.body.message).toContain('Email is required'); // Ejemplo
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get a user by id', async () => {
      const user = await new User({ name: 'Get Me', email: 'getme@example.com', password: 'password' }).save();

      const res = await request(app)
        .get(`/api/users/${user._id}`)
        .expect(200);

      expect(res.body.name).toBe('Get Me');
    });

    it('should return 404 if user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId(); // ID válido pero no existente
      await request(app)
        .get(`/api/users/${nonExistentId}`)
        .expect(404);
    });
  });
});
```
**Nota**: `userRoutes` y el modelo `User` deben estar implementados. Este ejemplo asume que `POST /api/users` crea un usuario y `GET /api/users/:id` lo recupera. Tu lógica de validación y manejo de errores en los controladores será crucial.

#### Manejo de Base de Datos de Prueba
*   **MongoDB en Memoria**: Usar `mongodb-memory-server`. Es rápido y se limpia solo.
    ```bash
    npm install --save-dev mongodb-memory-server
    ```
    ```javascript
    // jest.setup.js o en beforeAll
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoose = require('mongoose');
    let mongoServer;

    beforeAll(async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
    });

    // Limpiar colecciones en afterEach
    afterEach(async () => {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    });
    ```
*   **Base de Datos Separada**: Configura una base de datos MongoDB dedicada para pruebas. Asegúrate de limpiarla (`deleteMany({})` en colecciones) antes o después de cada prueba/suite.

---

### 6. Pruebas Unitarias en el Frontend (React)

Para React, la librería estándar de facto es **React Testing Library (RTL)**. Se enfoca en probar los componentes de la manera en que los usuarios los usan, evitando probar detalles de implementación.

#### Introducción a React Testing Library (RTL)
Principios:
*   Las pruebas deben parecerse lo más posible a cómo los usuarios usan tu aplicación.
*   Busca elementos por texto, rol, label, etc. (accesibilidad).
*   Evita seleccionar por `className` o `data-testid` a menos que sea necesario.

Instalación (si no usas CRA, que ya lo incluye):
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
# yarn add --dev @testing-library/react @testing-library/jest-dom
```
Importa `jest-dom` para matchers adicionales (en `jest.setup.js`):
```javascript
// jest.setup.js
import '@testing-library/jest-dom';
```

#### Probar Componentes (Renderizado, Props, Estado)
```javascript
// src/components/Greeting.js
import React, { useState } from 'react';

function Greeting({ name }) {
  const [message, setMessage] = useState(`Hola, ${name}!`);

  return (
    <div>
      <h1>{message}</h1>
      <button onClick={() => setMessage(`Adiós, ${name}!`)}>Cambiar Saludo</button>
    </div>
  );
}
export default Greeting;

// src/components/__tests__/Greeting.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Greeting from '../Greeting';

describe('Greeting Component', () => {
  it('renders initial greeting with prop name', () => {
    render(<Greeting name="Mundo" />);
    
    // screen.getByText busca un elemento que contenga el texto (puede ser parcial)
    expect(screen.getByText(/Hola, Mundo!/i)).toBeInTheDocument();
    // screen.getByRole es bueno para la accesibilidad
    expect(screen.getByRole('heading', { name: /Hola, Mundo!/i })).toBeInTheDocument();
  });

  it('changes message when button is clicked', () => {
    render(<Greeting name="Mundo" />);
    
    const button = screen.getByRole('button', { name: /Cambiar Saludo/i });
    fireEvent.click(button);

    expect(screen.getByRole('heading', { name: /Adiós, Mundo!/i })).toBeInTheDocument();
    expect(screen.queryByText(/Hola, Mundo!/i)).not.toBeInTheDocument(); // queryBy... devuelve null si no encuentra
  });
});
```
**Queries Comunes de RTL (`screen.*`)**:
*   `getBy...`: Encuentra un elemento o lanza error.
*   `queryBy...`: Encuentra un elemento o devuelve `null`. Útil para verificar ausencia.
*   `findBy...`: Encuentra un elemento o lanza error. Devuelve una promesa (para elementos asíncronos).
*   Variantes: `Role`, `LabelText`, `PlaceholderText`, `Text`, `DisplayValue`, `AltText`, `Title`, `TestId`.

#### Simular Eventos de Usuario (`fireEvent`)
`fireEvent` permite disparar eventos DOM.
```javascript
fireEvent.click(buttonElement);
fireEvent.change(inputElement, { target: { value: 'nuevo valor' } });
fireEvent.submit(formElement);
```
Existe `@testing-library/user-event` que simula interacciones de usuario más completas (como `type` que simula pulsaciones de teclas). Es generalmente preferido sobre `fireEvent` para interacciones complejas.
```bash
npm install --save-dev @testing-library/user-event
```
```javascript
import userEvent from '@testing-library/user-event';

// ...
await userEvent.click(buttonElement);
await userEvent.type(inputElement, 'hola mundo');
```

#### Probar Hooks Personalizados
Los hooks se prueban aislándolos o usándolos dentro de un componente de prueba. `@testing-library/react` (o `@testing-library/react-hooks` antes de React 18) ofrece `renderHook`.

```javascript
// src/hooks/useCounter.js
import { useState, useCallback } from 'react';

export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => c - 1), []);
  return { count, increment, decrement };
}

// src/hooks/__tests__/useCounter.test.js
import { renderHook, act } from '@testing-library/react'; // act se usa para envolver actualizaciones de estado
import { useCounter } from '../useCounter';

describe('useCounter Hook', () => {
  it('should initialize with initialValue or 0', () => {
    const { result } = renderHook(() => useCounter(5));
    expect(result.current.count).toBe(5);

    const { result: result2 } = renderHook(() => useCounter());
    expect(result2.current.count).toBe(0);
  });

  it('should increment count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    expect(result.current.count).toBe(1);
  });

  it('should decrement count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.decrement();
    });
    expect(result.current.count).toBe(-1);
  });
});
```

#### Mockear Llamadas API (`fetch`, `axios`)
Cuando un componente hace una llamada API, necesitas mockearla para evitar llamadas reales.
*   **Mockeando `fetch` global**:
    ```javascript
    // En tu archivo de prueba o en jest.setup.js
    global.fetch = jest.fn();

    // En tu prueba
    beforeEach(() => {
      fetch.mockClear(); // Limpia el mock entre pruebas
    });

    it('fetches data and displays it', async () => {
      fetch.mockResolvedValueOnce({ // Simula la respuesta de fetch
        ok: true,
        json: async () => ({ title: 'Fetched Title' }),
      });

      render(<MyComponent />); // MyComponent hace un fetch en useEffect

      // Espera a que aparezca el texto (findBy... es asíncrono)
      expect(await screen.findByText('Fetched Title')).toBeInTheDocument();
      expect(fetch).toHaveBeenCalledWith('/api/data'); // Verifica la URL
    });

    it('handles fetch error', async () => {
      fetch.mockRejectedValueOnce(new Error('API Error'));
      render(<MyComponent />);
      expect(await screen.findByText(/Error al cargar/i)).toBeInTheDocument();
    });
    ```
*   **Mockeando `axios`**:
    Si usas `axios`, puedes mockear el módulo:
    ```javascript
    // src/components/__tests__/DataFetcher.test.js
    import axios from 'axios';
    // ...
    jest.mock('axios'); // Mockea axios

    it('fetches data with axios', async () => {
      const mockData = { data: { title: 'Axios Data' } };
      axios.get.mockResolvedValue(mockData); // Simula axios.get().then(res => res.data)

      render(<DataFetcherComponent />); // Asume que este componente usa axios.get

      expect(await screen.findByText('Axios Data')).toBeInTheDocument();
      expect(axios.get).toHaveBeenCalledWith('/api/data-axios');
    });
    ```

#### Probar Context API o Redux (conceptos)
*   **Context API**: Para probar un componente que consume un contexto, necesitas envolverlo con el `Provider` del contexto en tu prueba. Puedes proporcionar valores mockeados al `Provider`.
    ```javascript
    // MyConsumingComponent.test.js
    import { MyContext } from '../MyContext';
    // ...
    render(
      <MyContext.Provider value={{ user: { name: 'Test User' } }}>
        <MyConsumingComponent />
      </MyContext.Provider>
    );
    // ... assertions ...
    ```
*   **Redux**: Similar al Contexto. Necesitas envolver tu componente con el `Provider` de Redux y un `store` de prueba. Puedes crear un store con reducers mockeados o un estado inicial específico para la prueba. Librerías como `redux-mock-store` pueden ser útiles, aunque RTL recomienda probar con un store real (con reducers simplificados si es necesario).
    ```javascript
    // ConnectedComponent.test.js
    import { Provider } from 'react-redux';
    import { configureStore } from '@reduxjs/toolkit'; // O tu forma de crear el store
    import myReducer from '../store/mySlice';

    const renderWithProviders = (ui, { initialState = {}, ...renderOptions } = {}) => {
      const store = configureStore({ reducer: { myFeature: myReducer }, preloadedState: initialState });
      function Wrapper({ children }) {
        return <Provider store={store}>{children}</Provider>;
      }
      return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
    };

    it('renders with initial state from Redux', () => {
      renderWithProviders(<ConnectedComponent />, {
        initialState: { myFeature: { data: 'Initial Data' } }
      });
      expect(screen.getByText('Initial Data')).toBeInTheDocument();
    });
    ```

---

### 7. Pruebas de Integración en el Frontend (React)

Estas pruebas verifican cómo múltiples componentes interactúan entre sí para lograr un flujo de usuario. A menudo implican renderizar un componente "padre" o una "página" completa y simular interacciones que afectan a varios componentes.

```javascript
// src/components/LoginForm.js
import React, { useState } from 'react';

function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email:</label>
        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="password">Password:</label>
        <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      <button type="submit">Login</button>
    </form>
  );
}

// src/App.js (ejemplo de integración)
function App() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  const handleLogin = async (credentials) => {
    try {
      // Simula llamada API
      const response = await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (credentials.email === 'test@example.com' && credentials.password === 'password') {
            resolve({ success: true, user: { name: 'Test User' } });
          } else {
            reject(new Error('Invalid credentials'));
          }
        }, 50);
      });
      setUser(response.user);
      setError('');
    } catch (err) {
      setError(err.message);
      setUser(null);
    }
  };

  if (user) {
    return <h1>Bienvenido, {user.name}</h1>;
  }

  return (
    <div>
      <LoginForm onSubmit={handleLogin} />
      {error && <p role="alert" style={{color: 'red'}}>{error}</p>}
    </div>
  );
}

// __tests__/App.integration.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // Preferido para interacciones
import App from '../App'; // O tu componente de página principal

describe('Login Flow Integration', () => {
  it('allows user to login successfully and displays welcome message', async () => {
    render(<App />);

    // Llenar el formulario
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password');
    
    // Enviar formulario
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    // Verificar resultado (la API mockeada o real debería responder)
    // findBy* espera a que el elemento aparezca (útil para actualizaciones asíncronas)
    expect(await screen.findByText(/Bienvenido, Test User/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument(); // El formulario ya no está
    expect(screen.queryByRole('alert')).not.toBeInTheDocument(); // No hay mensaje de error
  });

  it('shows error message on failed login', async () => {
    render(<App />);

    await userEvent.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.queryByText(/Bienvenido/i)).not.toBeInTheDocument();
  });
});
```
En este caso, la "API" está simulada dentro del componente `App`. En un caso real, mockearías `fetch` o `axios` como en las pruebas unitarias de componentes, pero la prueba se centraría en el flujo a través de varios componentes renderizados.

---

### 8. Temas Avanzados y Buenas Prácticas

#### Cobertura de Código (Code Coverage)
Jest puede generar informes de cobertura para ver qué partes de tu código están cubiertas por las pruebas.
```bash
npm run test -- --coverage
# O si tienes el script:
npm run test:coverage
```
Esto generará un directorio `coverage/` con un informe HTML (`lcov-report/index.html`).
Configura umbrales en `jest.config.js`:
```javascript
// jest.config.js
module.exports = {
  // ...
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: -10, // Permite 10 statements sin cubrir (ejemplo)
    },
  },
};
```

#### Pruebas de Snapshot
Los snapshots capturan el "aspecto" de un componente React renderizado o una estructura de datos y lo guardan en un archivo (`.snap`). En ejecuciones posteriores, Jest compara la nueva salida con el snapshot guardado. Si hay diferencias, la prueba falla, y puedes actualizar el snapshot si el cambio es intencional (con `jest -u`).

```javascript
it('renders correctly (snapshot)', () => {
  const { asFragment } = render(<MyComponent prop="value" />);
  expect(asFragment()).toMatchSnapshot();
});
```
**Precaución**:
*   Son fáciles de generar pero pueden volverse frágiles si la UI cambia mucho.
*   No prueban comportamiento, solo la salida renderizada.
*   Úsalos con moderación y para componentes que no cambian frecuentemente o para verificar estructuras de datos complejas.
*   Siempre revisa los diffs de snapshot cuidadosamente antes de actualizarlos.

#### Organización de las Pruebas
*   **Colocación**:
    *   `__tests__` subdirectorio: `src/components/__tests__/MyComponent.test.js`
    *   Archivos `.test.js` o `.spec.js` junto al fuente: `src/components/MyComponent.js` y `src/components/MyComponent.test.js` (preferido por muchos por la cercanía).
*   **Nomenclatura**:
    *   Nombre del archivo: `nombreDelModulo.test.js` o `nombreDelModulo.spec.js`.
    *   `describe`: Nombre del módulo/componente/función.
    *   `it`/`test`: "should [hacer algo] when [condición]" o "debería [hacer algo] cuando [condición]". Sé descriptivo.

#### Pruebas en un Entorno de CI/CD
*   Integra `npm test` en tu pipeline de CI (GitHub Actions, GitLab CI, Jenkins, etc.).
*   Asegúrate de que las pruebas fallen si la cobertura no alcanza los umbrales.
*   Considera ejecutar pruebas en diferentes entornos o navegadores (para frontend) si es necesario, aunque Jest con JSDOM es suficiente para la mayoría de las pruebas unitarias/integración de React. Para pruebas E2E (End-to-End), usarías herramientas como Cypress o Playwright.

---

### 9. Conclusión

Dominar Jest y React Testing Library te permitirá escribir código más robusto, mantenible y con menos bugs en tus aplicaciones MERN.
*   **Empieza simple**: No intentes probar todo al 100% desde el día uno.
*   **Prioriza**: Prueba la lógica crítica de negocio, los flujos de usuario importantes y los componentes complejos primero.
*   **Aislamiento**: Recuerda la diferencia entre pruebas unitarias (mockear dependencias) y de integración (probar interacciones).
*   **Prueba como el usuario**: Especialmente en React, enfócate en lo que el usuario ve e interactúa, no en detalles de implementación.
*   **Itera**: La escritura de pruebas es una habilidad que mejora con la práctica. Revisa y refactoriza tus pruebas igual que tu código.

Esta guía cubre los aspectos más importantes. El ecosistema de pruebas es vasto, pero estos fundamentos te darán una base sólida para construir aplicaciones MERN de alta calidad. ¡Feliz testeo!