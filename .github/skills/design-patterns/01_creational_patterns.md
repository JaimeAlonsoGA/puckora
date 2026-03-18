# CREATIONAL PATTERNS — TypeScript Agent Reference

## 1. Factory Method

**Intent:** Define an interface for creating an object; let subclasses decide which class to instantiate.

**Use when:**
- You don't know ahead of time which class you need to instantiate.
- Subclasses should control what gets created.

**Do NOT use when:**
- There's only one concrete type — plain `new` is fine.
- Creation logic is trivial and won't vary.

**Pattern:**
```typescript
interface Product { operation(): string; }

class ConcreteProductA implements Product {
  operation() { return 'ProductA'; }
}

abstract class Creator {
  abstract factoryMethod(): Product;

  someOperation(): string {
    const product = this.factoryMethod();
    return product.operation();
  }
}

class ConcreteCreatorA extends Creator {
  factoryMethod(): Product { return new ConcreteProductA(); }
}
```

**DO:**
```typescript
// Subclass decides what to create
class LoggerFactory extends Creator {
  factoryMethod(): Product { return new FileLogger(); }
}
```

**DON'T:**
```typescript
// Bypasses pattern — hardcoded type defeats the purpose
class Creator {
  create() { return new ConcreteProductA(); } // ❌ not overridable
}
```

---

## 2. Abstract Factory

**Intent:** Produce families of related objects without specifying concrete classes.

**Use when:**
- System must work with multiple families of products.
- Products within a family must be used together.

**Do NOT use when:**
- Only one product family exists — Factory Method is enough.
- Products in the family don't interact.

**Pattern:**
```typescript
interface Button { render(): void; }
interface Checkbox { render(): void; }

interface GUIFactory {
  createButton(): Button;
  createCheckbox(): Checkbox;
}

class MacFactory implements GUIFactory {
  createButton(): Button { return new MacButton(); }
  createCheckbox(): Checkbox { return new MacCheckbox(); }
}

class WinFactory implements GUIFactory {
  createButton(): Button { return new WinButton(); }
  createCheckbox(): Checkbox { return new WinCheckbox(); }
}
```

**DO:**
```typescript
function buildUI(factory: GUIFactory) {
  const btn = factory.createButton();
  const chk = factory.createCheckbox();
  btn.render();
  chk.render();
}
```

**DON'T:**
```typescript
// Mixing families breaks consistency
const btn = new MacButton();
const chk = new WinCheckbox(); // ❌ inconsistent family
```

---

## 3. Builder

**Intent:** Construct complex objects step by step using the same process for different representations.

**Use when:**
- Object construction has many optional parameters.
- You need different representations of the same object.

**Do NOT use when:**
- Object is simple with 1–3 fields — just use a constructor or object literal.

**Pattern:**
```typescript
class Car {
  seats: number = 0;
  engine: string = '';
  gps: boolean = false;
}

interface Builder {
  setSeats(n: number): this;
  setEngine(e: string): this;
  setGPS(v: boolean): this;
  build(): Car;
}

class CarBuilder implements Builder {
  private car = new Car();
  setSeats(n: number) { this.car.seats = n; return this; }
  setEngine(e: string) { this.car.engine = e; return this; }
  setGPS(v: boolean) { this.car.gps = v; return this; }
  build() { return this.car; }
}
```

**DO:**
```typescript
const car = new CarBuilder().setSeats(4).setEngine('V8').setGPS(true).build();
```

**DON'T:**
```typescript
// Telescoping constructor — unreadable at scale
const car = new Car(4, 'V8', true, false, 'red', 'auto'); // ❌
```

---

## 4. Prototype

**Intent:** Clone existing objects without coupling to their classes.

**Use when:**
- Object creation is expensive and a copy is cheaper.
- You need copies of objects at runtime without knowing their exact type.

**Do NOT use when:**
- Objects contain circular references that are hard to clone.
- Deep vs shallow clone semantics are ambiguous.

**Pattern:**
```typescript
interface Prototype {
  clone(): this;
}

class ConcretePrototype implements Prototype {
  constructor(public data: string[] = []) {}

  clone(): this {
    const copy = Object.create(this);
    copy.data = [...this.data]; // deep clone critical fields
    return copy;
  }
}
```

**DO:**
```typescript
const original = new ConcretePrototype(['a', 'b']);
const copy = original.clone();
copy.data.push('c'); // doesn't affect original
```

**DON'T:**
```typescript
const copy = { ...original }; // ❌ shallow — nested objects are shared references
```

---

## 5. Singleton

**Intent:** Ensure a class has exactly one instance; provide a global access point.

**Use when:**
- Exactly one shared resource: config, connection pool, logger.

**Do NOT use when:**
- You need testability — Singleton makes mocking hard.
- Multiple instances could legitimately exist.

**Pattern:**
```typescript
class Singleton {
  private static instance: Singleton;
  private constructor() {}

  static getInstance(): Singleton {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }
}
```

**DO:**
```typescript
const a = Singleton.getInstance();
const b = Singleton.getInstance();
console.log(a === b); // true
```

**DON'T:**
```typescript
// Don't use global variables as poor-man's singleton
let instance: MyClass | null = null; // ❌ not encapsulated, not thread-safe
```

> **Warning:** Singleton is a code smell in DI-heavy architectures. Prefer injecting a shared instance instead.
