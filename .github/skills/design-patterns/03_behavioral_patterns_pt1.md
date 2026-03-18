# BEHAVIORAL PATTERNS — TypeScript Agent Reference (Part 1)

## 13. Chain of Responsibility

**Intent:** Pass a request along a chain of handlers; each handler decides to process or forward it.

**Use when:**
- More than one object may handle a request, and the handler isn't known a priori.
- You want to issue a request to one of several objects without specifying the receiver explicitly.
- The set of handlers should be specifiable dynamically.

**Do NOT use when:**
- Every request must be handled — CoR gives no guarantee of handling.
- Chain is always the same and never dynamic — a simple if/else is clearer.

**Pattern:**
```typescript
abstract class Handler {
  private next: Handler | null = null;

  setNext(handler: Handler): Handler {
    this.next = handler;
    return handler;
  }

  handle(request: number): string | null {
    if (this.next) return this.next.handle(request);
    return null;
  }
}

class SmallHandler extends Handler {
  handle(request: number): string | null {
    if (request < 10) return `SmallHandler handled ${request}`;
    return super.handle(request);
  }
}

class LargeHandler extends Handler {
  handle(request: number): string | null {
    if (request >= 10) return `LargeHandler handled ${request}`;
    return super.handle(request);
  }
}
```

**DO:**
```typescript
const small = new SmallHandler();
const large = new LargeHandler();
small.setNext(large);

console.log(small.handle(5));  // SmallHandler handled 5
console.log(small.handle(15)); // LargeHandler handled 15
```

**DON'T:**
```typescript
// Hardcoding handler selection — no chain benefit
function handle(request: number) {
  if (request < 10) smallHandler.handle(request); // ❌ rigid, not extensible
  else largeHandler.handle(request);
}
```

---

## 14. Command

**Intent:** Encapsulate a request as an object, enabling queuing, logging, and undo operations.

**Use when:**
- You need undoable operations.
- You want to queue, schedule, or log requests.
- You need to parameterize objects with operations.

**Do NOT use when:**
- Operations are simple and one-shot — plain function calls are sufficient.
- Undo is not required and there's no queuing — Command adds unnecessary overhead.

**Pattern:**
```typescript
interface Command {
  execute(): void;
  undo(): void;
}

class Editor {
  text = '';
}

class TypeCommand implements Command {
  constructor(private editor: Editor, private text: string) {}
  execute() { this.editor.text += this.text; }
  undo() { this.editor.text = this.editor.text.slice(0, -this.text.length); }
}

class CommandHistory {
  private history: Command[] = [];

  push(cmd: Command) {
    cmd.execute();
    this.history.push(cmd);
  }

  undo() {
    const cmd = this.history.pop();
    cmd?.undo();
  }
}
```

**DO:**
```typescript
const editor = new Editor();
const history = new CommandHistory();
history.push(new TypeCommand(editor, 'Hello'));
history.push(new TypeCommand(editor, ' World'));
console.log(editor.text); // "Hello World"
history.undo();
console.log(editor.text); // "Hello"
```

**DON'T:**
```typescript
// Storing mutable state snapshots in command — use Memento for that instead
class TypeCommand {
  private snapshot = cloneEntireApp(); // ❌ expensive, wrong pattern
}
```

---

## 15. Iterator

**Intent:** Traverse a collection without exposing its underlying representation.

**Use when:**
- You need a standard traversal interface across different collection types.
- You want multiple simultaneous traversals of the same collection.

**Do NOT use when:**
- Collection is simple and a `for` loop is sufficient.
- You're working with arrays in TypeScript — use built-in iteration (`for...of`).

**Pattern:**
```typescript
interface Iterator<T> {
  hasNext(): boolean;
  next(): T;
}

interface IterableCollection<T> {
  createIterator(): Iterator<T>;
}

class NumberCollection implements IterableCollection<number> {
  constructor(private items: number[]) {}

  createIterator(): Iterator<number> {
    let index = 0;
    const items = this.items;
    return {
      hasNext: () => index < items.length,
      next: () => items[index++],
    };
  }
}
```

**DO:**
```typescript
const col = new NumberCollection([1, 2, 3]);
const it = col.createIterator();
while (it.hasNext()) console.log(it.next());
```

**DON'T:**
```typescript
// Exposing internal structure to traverse
class NumberCollection {
  items: number[]; // ❌ consumers access .items directly — breaks encapsulation
}
```

> **TypeScript note:** Prefer implementing `[Symbol.iterator]()` to support native `for...of`.

---

## 16. Mediator

**Intent:** Define an object that encapsulates how a set of objects interact, reducing direct dependencies.

**Use when:**
- Many objects communicate in complex ways, creating tangled dependencies.
- You want to reuse components that are too coupled to each other.
- Chat rooms, UI component coordination, air traffic control.

**Do NOT use when:**
- The mediator itself becomes a god object — split it if it grows too large.
- Objects interact simply (1–2 dependencies each) — direct calls are cleaner.

**Pattern:**
```typescript
interface Mediator {
  notify(sender: Component, event: string): void;
}

abstract class Component {
  constructor(protected mediator: Mediator) {}
}

class Button extends Component {
  click() { this.mediator.notify(this, 'click'); }
}

class TextBox extends Component {
  text = '';
  setText(t: string) { this.text = t; }
}

class Dialog implements Mediator {
  constructor(public button: Button, public textBox: TextBox) {}

  notify(sender: Component, event: string) {
    if (sender === this.button && event === 'click') {
      console.log(`TextBox value: ${this.textBox.text}`);
    }
  }
}
```

**DO:**
```typescript
const dialog = new Dialog(button, textBox);
// button and textBox only know about Mediator interface
button.click(); // mediator coordinates
```

**DON'T:**
```typescript
// Components calling each other directly
class Button {
  click() { this.textBox.clear(); this.label.update(); } // ❌ tightly coupled
}
```

---

## 17. Memento

**Intent:** Capture and externalize an object's internal state so it can be restored later, without violating encapsulation.

**Use when:**
- You need undo/redo functionality.
- A snapshot of state must be saved and restored.

**Do NOT use when:**
- State is trivial (single value) — just store it directly.
- Snapshots are too large — consider incremental diffs instead.

**Pattern:**
```typescript
class Memento {
  constructor(private readonly state: string) {}
  getState(): string { return this.state; }
}

class Originator {
  private state: string = '';

  setState(s: string) { this.state = s; }
  getState() { return this.state; }

  save(): Memento { return new Memento(this.state); }
  restore(m: Memento) { this.state = m.getState(); }
}

class Caretaker {
  private history: Memento[] = [];

  constructor(private originator: Originator) {}

  backup() { this.history.push(this.originator.save()); }

  undo() {
    const m = this.history.pop();
    if (m) this.originator.restore(m);
  }
}
```

**DO:**
```typescript
const editor = new Originator();
const caretaker = new Caretaker(editor);
editor.setState('v1'); caretaker.backup();
editor.setState('v2'); caretaker.backup();
editor.setState('v3');
caretaker.undo(); // back to v2
```

**DON'T:**
```typescript
// Exposing state fields publicly to save/restore — breaks encapsulation
const snapshot = { state: editor.state }; // ❌ Originator's internals are exposed
```
