# BEHAVIORAL PATTERNS — TypeScript Agent Reference (Part 2)

## 18. Observer

**Intent:** Define a subscription mechanism to notify multiple objects of events on another object.

**Use when:**
- A change in one object requires updating others, and you don't know how many.
- Objects should be able to notify others without assumptions about who those objects are.
- Event systems, reactive state, pub/sub.

**Do NOT use when:**
- Observers are always the same fixed set — direct calls are simpler.
- Notification order matters and is hard to control — Observer doesn't guarantee order reliably.
- Memory leaks from forgotten subscriptions are a concern — always unsubscribe.

**Pattern:**
```typescript
interface Observer {
  update(event: string, data: unknown): void;
}

interface Subject {
  subscribe(observer: Observer): void;
  unsubscribe(observer: Observer): void;
  notify(event: string, data: unknown): void;
}

class EventEmitter implements Subject {
  private observers: Observer[] = [];

  subscribe(o: Observer) { this.observers.push(o); }
  unsubscribe(o: Observer) { this.observers = this.observers.filter(x => x !== o); }
  notify(event: string, data: unknown) {
    this.observers.forEach(o => o.update(event, data));
  }
}

class Logger implements Observer {
  update(event: string, data: unknown) {
    console.log(`[LOG] ${event}:`, data);
  }
}
```

**DO:**
```typescript
const emitter = new EventEmitter();
const logger = new Logger();
emitter.subscribe(logger);
emitter.notify('userCreated', { id: 1 });
emitter.unsubscribe(logger); // clean up
```

**DON'T:**
```typescript
// Forgetting to unsubscribe — memory leak in long-lived subjects
emitter.subscribe(new Logger()); // ❌ no reference kept, can't unsubscribe
```

---

## 19. State

**Intent:** Allow an object to alter its behavior when its internal state changes. The object appears to change its class.

**Use when:**
- Object behavior depends on its state, and it must change behavior at runtime.
- State-specific code would produce large conditionals (`if/switch` on state).
- ATMs, vending machines, order workflows, traffic lights.

**Do NOT use when:**
- Few states and transitions — a simple enum + switch is readable enough.
- State logic is trivial and unlikely to grow.

**Pattern:**
```typescript
interface State {
  insertCoin(): void;
  pressButton(): void;
}

class VendingMachine {
  private state: State;

  constructor() { this.state = new IdleState(this); }

  setState(s: State) { this.state = s; }
  insertCoin() { this.state.insertCoin(); }
  pressButton() { this.state.pressButton(); }
}

class IdleState implements State {
  constructor(private machine: VendingMachine) {}

  insertCoin() {
    console.log('Coin inserted');
    this.machine.setState(new HasCoinState(this.machine));
  }

  pressButton() { console.log('Insert coin first'); }
}

class HasCoinState implements State {
  constructor(private machine: VendingMachine) {}

  insertCoin() { console.log('Already has a coin'); }

  pressButton() {
    console.log('Dispensing item');
    this.machine.setState(new IdleState(this.machine));
  }
}
```

**DO:**
```typescript
const vm = new VendingMachine();
vm.pressButton(); // "Insert coin first"
vm.insertCoin();  // "Coin inserted"
vm.pressButton(); // "Dispensing item"
```

**DON'T:**
```typescript
// Giant switch on enum — doesn't scale
pressButton() {
  if (this.state === 'idle') { ... }
  else if (this.state === 'hasCoin') { ... }
  else if (this.state === 'dispensing') { ... } // ❌ add more states = spaghetti
}
```

---

## 20. Strategy

**Intent:** Define a family of algorithms, encapsulate each one, and make them interchangeable.

**Use when:**
- Multiple variants of an algorithm exist and you want to switch between them at runtime.
- You want to eliminate conditionals that select behavior.
- Sorting, payment processing, compression, routing.

**Do NOT use when:**
- Only one algorithm exists or algorithms rarely change — plain functions suffice.
- Strategies need to share state — consider another pattern.

**Pattern:**
```typescript
interface SortStrategy {
  sort(data: number[]): number[];
}

class BubbleSort implements SortStrategy {
  sort(data: number[]): number[] {
    // bubble sort implementation
    return [...data].sort((a, b) => a - b); // simplified
  }
}

class QuickSort implements SortStrategy {
  sort(data: number[]): number[] {
    // quick sort implementation
    return [...data].sort((a, b) => a - b); // simplified
  }
}

class Sorter {
  constructor(private strategy: SortStrategy) {}

  setStrategy(s: SortStrategy) { this.strategy = s; }
  sort(data: number[]): number[] { return this.strategy.sort(data); }
}
```

**DO:**
```typescript
const sorter = new Sorter(new BubbleSort());
sorter.sort([3, 1, 2]);

sorter.setStrategy(new QuickSort()); // swap at runtime
sorter.sort([3, 1, 2]);
```

**DON'T:**
```typescript
// Inline algorithm selection
class Sorter {
  sort(data: number[], algorithm: string) {
    if (algorithm === 'bubble') { ... }
    else if (algorithm === 'quick') { ... } // ❌ not extensible, violates OCP
  }
}
```

> **TypeScript note:** For simple cases, pass a function instead of a Strategy object:
> ```typescript
> type SortFn = (data: number[]) => number[];
> class Sorter { constructor(private sortFn: SortFn) {} }
> ```

---

## 21. Template Method

**Intent:** Define the skeleton of an algorithm in a base class, letting subclasses override specific steps without changing the structure.

**Use when:**
- Multiple classes share the same algorithm structure but differ in specific steps.
- You want to control extension points explicitly.

**Do NOT use when:**
- Clients need to change the overall algorithm structure — use Strategy instead.
- The base class becomes too complex — prefer composition over inheritance.

**Pattern:**
```typescript
abstract class DataProcessor {
  // Template method — final algorithm
  process(): void {
    this.readData();
    this.processData();
    this.writeData();
  }

  protected abstract readData(): void;
  protected abstract processData(): void;

  // Hook — optional override
  protected writeData(): void {
    console.log('Writing to default output');
  }
}

class CsvProcessor extends DataProcessor {
  protected readData() { console.log('Reading CSV'); }
  protected processData() { console.log('Processing CSV rows'); }
}

class JsonProcessor extends DataProcessor {
  protected readData() { console.log('Reading JSON'); }
  protected processData() { console.log('Processing JSON fields'); }
  protected writeData() { console.log('Writing JSON output'); } // override hook
}
```

**DO:**
```typescript
new CsvProcessor().process();  // fixed steps, CSV-specific implementation
new JsonProcessor().process(); // same structure, JSON-specific steps
```

**DON'T:**
```typescript
// Overriding the template method itself — breaks the invariant
class BadProcessor extends DataProcessor {
  process() { // ❌ defeats the pattern — caller can no longer trust the structure
    this.writeData();
    this.readData(); // wrong order
  }
}
```

---

## 22. Visitor

**Intent:** Separate an algorithm from the object structure it operates on. Add new operations without modifying the classes.

**Use when:**
- You need to perform many distinct and unrelated operations on an object structure.
- You want to add operations to classes without modifying them (open/closed principle).
- ASTs, document export, static analysis.

**Do NOT use when:**
- The object hierarchy changes frequently — adding a new element type requires updating every visitor.
- Operations are simple and tightly coupled to data — just add methods directly.

**Pattern:**
```typescript
interface Visitor {
  visitCircle(c: Circle): void;
  visitSquare(s: Square): void;
}

interface Shape {
  accept(v: Visitor): void;
}

class Circle implements Shape {
  constructor(public radius: number) {}
  accept(v: Visitor) { v.visitCircle(this); }
}

class Square implements Shape {
  constructor(public side: number) {}
  accept(v: Visitor) { v.visitSquare(this); }
}

class AreaCalculator implements Visitor {
  visitCircle(c: Circle) { console.log(Math.PI * c.radius ** 2); }
  visitSquare(s: Square) { console.log(s.side ** 2); }
}

class XmlExporter implements Visitor {
  visitCircle(c: Circle) { console.log(`<circle r="${c.radius}"/>`); }
  visitSquare(s: Square) { console.log(`<square side="${s.side}"/>`); }
}
```

**DO:**
```typescript
const shapes: Shape[] = [new Circle(5), new Square(3)];
const calculator = new AreaCalculator();
shapes.forEach(s => s.accept(calculator));

// Add new operation without touching Shape classes
const exporter = new XmlExporter();
shapes.forEach(s => s.accept(exporter));
```

**DON'T:**
```typescript
// Adding methods directly to each class for every operation
class Circle {
  area() { ... }
  toXml() { ... }
  toJson() { ... }
  toSvg() { ... } // ❌ violates single responsibility; class grows without bound
}
```
