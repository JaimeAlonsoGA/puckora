# DESIGN PATTERN SELECTION GUIDE — TypeScript Agent Reference

## Decision Tree by Problem Type

### Object Creation

| Problem                                                       | Pattern          |
| ------------------------------------------------------------- | ---------------- |
| Don't know which class to instantiate; subclass should decide | Factory Method   |
| Need families of related objects to be created together       | Abstract Factory |
| Complex object with many optional parts                       | Builder          |
| Need copies of objects at runtime                             | Prototype        |
| Exactly one shared instance required                          | Singleton        |

### Structure / Composition

| Problem                                                  | Pattern   |
| -------------------------------------------------------- | --------- |
| Incompatible interfaces must work together               | Adapter   |
| Two dimensions of variation; avoid class explosion       | Bridge    |
| Uniform treatment of individual objects and groups       | Composite |
| Add behaviors to objects dynamically without subclassing | Decorator |
| Simplify access to a complex subsystem                   | Facade    |
| Many similar objects consuming too much memory           | Flyweight |
| Control access to an object (lazy init, caching, auth)   | Proxy     |

### Behavior / Communication

| Problem                                                  | Pattern                 |
| -------------------------------------------------------- | ----------------------- |
| Request may be handled by one of multiple objects        | Chain of Responsibility |
| Parameterize, queue, log, or undo operations             | Command                 |
| Traverse a collection without exposing internals         | Iterator                |
| Many objects communicate in complex ways (decouple them) | Mediator                |
| Save/restore object state (undo)                         | Memento                 |
| Notify dependents of state changes                       | Observer                |
| Behavior varies with internal state                      | State                   |
| Swap algorithms at runtime                               | Strategy                |
| Same algorithm skeleton, varying steps                   | Template Method         |
| Add operations to a class hierarchy without modifying it | Visitor                 |

---

## Anti-patterns: When NOT to Use Patterns

### Over-engineering signals
- Applying a pattern before the need is concrete → YAGNI violation.
- Using Abstract Factory with a single product family.
- Using Command for one-shot, non-undoable, non-queued operations.
- Using Visitor on a hierarchy that changes frequently.
- Using Bridge when only one dimension varies.

### Pattern misuse
- **Singleton** as a global variable substitute — makes testing impossible.
- **Decorator** when you actually need to remove behaviors — not supported.
- **Template Method** when the algorithm structure itself must vary — use Strategy.
- **Facade** that exposes subsystem internals via getters — defeats encapsulation.
- **Observer** without unsubscribe — guaranteed memory leak.
- **Composite** with type-checking on leaf vs composite — defeats the uniform interface.

---

## Patterns That Are Frequently Confused

### Strategy vs Template Method
- **Strategy**: algorithm is fully encapsulated in a separate class, swapped via composition.
- **Template Method**: algorithm skeleton in base class, specific steps overridden in subclasses.
- Rule: prefer Strategy when the full algorithm varies; Template Method when only steps vary.

### Command vs Strategy
- **Strategy**: varies *how* something is done (algorithm selection).
- **Command**: varies *what* is done (operation as object, with undo/queue support).

### Decorator vs Proxy
- **Decorator**: adds behavior, client chooses which decorators to apply.
- **Proxy**: controls access, client often unaware a proxy exists.

### Adapter vs Facade
- **Adapter**: makes one interface compatible with another (one class).
- **Facade**: simplifies a subsystem of multiple classes.

### Observer vs Mediator
- **Observer**: subjects notify observers directly; observers know what to expect.
- **Mediator**: components notify mediator; mediator decides what happens — components don't interact directly.

### Factory Method vs Abstract Factory
- **Factory Method**: one product, subclass overrides the factory.
- **Abstract Factory**: multiple related products, whole factory is swapped.

---

## TypeScript-Specific Implementation Notes

### Interfaces over abstract classes
Prefer `interface` for patterns where implementation is completely delegated (Strategy, Observer, Command, Iterator, Visitor). Use `abstract class` only when sharing implementation (Template Method, Creator in Factory Method).

### Generics
Use generics in Iterator, Composite, and Chain of Responsibility to avoid `any`:
```typescript
interface Iterator<T> { next(): T; hasNext(): boolean; }
```

### Function-based Strategy
For simple strategies with no state, a function type is sufficient:
```typescript
type Comparator<T> = (a: T, b: T) => number;
```

### Private constructor for Singleton
```typescript
class Config {
  private static instance: Config;
  private constructor() {}
  static getInstance() { return this.instance ??= new Config(); }
}
```

### Symbol.iterator for Iterator pattern
```typescript
class Collection<T> {
  [Symbol.iterator](): IterableIterator<T> { return this.items[Symbol.iterator](); }
}
```

---

## Pattern Combination Cheatsheet

| Combination                      | Use case                                                |
| -------------------------------- | ------------------------------------------------------- |
| Command + Memento                | Full undo/redo system                                   |
| Factory Method + Template Method | Framework-level object creation with customizable steps |
| Composite + Iterator             | Tree traversal                                          |
| Composite + Visitor              | Operations over a tree structure                        |
| Decorator + Strategy             | Wrap behavior + swap algorithm inside                   |
| Observer + Mediator              | Decouple event system across many components            |
| Proxy + Decorator                | Access control + added behavior                         |
| Abstract Factory + Singleton     | Single factory instance per runtime environment         |
