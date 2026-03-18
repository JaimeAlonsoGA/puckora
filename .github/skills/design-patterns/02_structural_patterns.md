# STRUCTURAL PATTERNS — TypeScript Agent Reference

## 6. Adapter

**Intent:** Make incompatible interfaces work together by wrapping one in a class that implements the expected interface.

**Use when:**
- You need to use an existing class but its interface doesn't match what's required.
- Integrating third-party libraries you can't modify.

**Do NOT use when:**
- You control both sides — just align the interfaces directly.
- The impedance mismatch is too large (redesign instead).

**Pattern:**
```typescript
// Existing incompatible class
class XmlDataSource {
  getXmlData(): string { return '<data>...</data>'; }
}

// Expected interface
interface JsonDataSource {
  getJsonData(): object;
}

// Adapter
class XmlToJsonAdapter implements JsonDataSource {
  constructor(private source: XmlDataSource) {}

  getJsonData(): object {
    const xml = this.source.getXmlData();
    return parseXmlToJson(xml); // conversion logic
  }
}
```

**DO:**
```typescript
const adapter = new XmlToJsonAdapter(new XmlDataSource());
processJson(adapter.getJsonData()); // caller doesn't know about XML
```

**DON'T:**
```typescript
// Leaking the adapted interface to the caller
function process(src: XmlDataSource | JsonDataSource) {
  if (src instanceof XmlDataSource) { ... } // ❌ defeats the pattern
}
```

---

## 7. Bridge

**Intent:** Decouple an abstraction from its implementation so both can vary independently.

**Use when:**
- You need to extend a class in multiple orthogonal dimensions (e.g., shape × color, platform × feature).
- You want to avoid an exponential class hierarchy.

**Do NOT use when:**
- Only one dimension varies — inheritance is fine.
- Abstraction and implementation are tightly coupled by nature.

**Pattern:**
```typescript
interface Renderer {
  renderCircle(radius: number): void;
}

class VectorRenderer implements Renderer {
  renderCircle(radius: number) { console.log(`Vector circle r=${radius}`); }
}

class RasterRenderer implements Renderer {
  renderCircle(radius: number) { console.log(`Raster circle r=${radius}`); }
}

abstract class Shape {
  constructor(protected renderer: Renderer) {}
  abstract draw(): void;
}

class Circle extends Shape {
  constructor(renderer: Renderer, private radius: number) { super(renderer); }
  draw() { this.renderer.renderCircle(this.radius); }
}
```

**DO:**
```typescript
const c1 = new Circle(new VectorRenderer(), 5);
const c2 = new Circle(new RasterRenderer(), 5);
// Switch renderer without changing Circle
```

**DON'T:**
```typescript
// Exponential hierarchy — don't do this
class VectorCircle extends Circle {}
class RasterCircle extends Circle {}
class VectorSquare extends Square {}
class RasterSquare extends Square {} // ❌ combinatorial explosion
```

---

## 8. Composite

**Intent:** Compose objects into tree structures. Treat individual objects and compositions uniformly.

**Use when:**
- You have part-whole hierarchies (file system, UI trees, org charts).
- Clients should treat leaf and composite nodes identically.

**Do NOT use when:**
- The tree is fixed and simple — just use a plain recursive data structure.
- Uniform interface forces meaningless operations on leaves.

**Pattern:**
```typescript
interface Component {
  operation(): string;
}

class Leaf implements Component {
  constructor(private name: string) {}
  operation(): string { return this.name; }
}

class Composite implements Component {
  private children: Component[] = [];

  add(c: Component) { this.children.push(c); }
  remove(c: Component) { this.children = this.children.filter(x => x !== c); }

  operation(): string {
    return `Branch(${this.children.map(c => c.operation()).join('+')})`;
  }
}
```

**DO:**
```typescript
const root = new Composite();
root.add(new Leaf('A'));
const branch = new Composite();
branch.add(new Leaf('B'));
branch.add(new Leaf('C'));
root.add(branch);
root.operation(); // "Branch(A+Branch(B+C))"
```

**DON'T:**
```typescript
// Type-checking children defeats the pattern
if (node instanceof Leaf) { ... }
else if (node instanceof Composite) { ... } // ❌ use the Component interface
```

---

## 9. Decorator

**Intent:** Attach new behaviors to objects dynamically by wrapping them. Alternative to subclassing.

**Use when:**
- You need to add responsibilities to objects without affecting others of the same class.
- Subclassing would produce an unwieldy number of combinations.

**Do NOT use when:**
- The order of decorators matters in unexpected ways — this gets confusing fast.
- You need to remove behaviors (not designed for that).

**Pattern:**
```typescript
interface DataSource {
  writeData(data: string): void;
  readData(): string;
}

class FileDataSource implements DataSource {
  private data = '';
  writeData(data: string) { this.data = data; }
  readData() { return this.data; }
}

class EncryptionDecorator implements DataSource {
  constructor(private wrappee: DataSource) {}

  writeData(data: string) {
    this.wrappee.writeData(encrypt(data));
  }

  readData(): string {
    return decrypt(this.wrappee.readData());
  }
}

class CompressionDecorator implements DataSource {
  constructor(private wrappee: DataSource) {}
  writeData(data: string) { this.wrappee.writeData(compress(data)); }
  readData() { return decompress(this.wrappee.readData()); }
}
```

**DO:**
```typescript
let source: DataSource = new FileDataSource();
source = new CompressionDecorator(source);
source = new EncryptionDecorator(source);
source.writeData('hello'); // compressed then encrypted
```

**DON'T:**
```typescript
// Don't use inheritance for feature combinations
class EncryptedCompressedFileSource extends FileDataSource {} // ❌ doesn't scale
```

---

## 10. Facade

**Intent:** Provide a simplified interface to a complex subsystem.

**Use when:**
- A subsystem has many classes and complex interactions.
- You want to layer your system and define entry points per layer.

**Do NOT use when:**
- The facade becomes a "god object" that does too much.
- Consumers need full subsystem access — don't hide it behind a facade.

**Pattern:**
```typescript
class VideoConverter {
  convert(filename: string, format: string): File {
    const file = new VideoFile(filename);
    const codec = CodecFactory.extract(file);
    const buffer = BitrateReader.read(filename, codec);
    const result = BitrateReader.convert(buffer, new OggCompressionCodec());
    return new AudioMixer().fix(result);
  }
}
```

**DO:**
```typescript
const converter = new VideoConverter();
const mp4 = converter.convert('video.avi', 'mp4'); // simple call, complex internals hidden
```

**DON'T:**
```typescript
// Don't expose subsystem internals through the facade
class VideoConverter {
  getCodecFactory() { return this.codecFactory; } // ❌ breaks encapsulation
}
```

---

## 11. Flyweight

**Intent:** Share common state among many fine-grained objects to reduce memory usage.

**Use when:**
- Application creates a huge number of similar objects.
- Most object state can be made extrinsic (passed in at runtime).

**Do NOT use when:**
- Object count is small — premature optimization.
- Extrinsic state is hard to compute or pass around.

**Pattern:**
```typescript
class TreeType {
  constructor(
    public name: string,
    public color: string,
    public texture: string
  ) {}

  draw(x: number, y: number) {
    // render using shared intrinsic state + extrinsic x,y
  }
}

class TreeTypeFactory {
  private static cache = new Map<string, TreeType>();

  static getTreeType(name: string, color: string, texture: string): TreeType {
    const key = `${name}_${color}_${texture}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, new TreeType(name, color, texture));
    }
    return this.cache.get(key)!;
  }
}

class Tree {
  constructor(
    private x: number,
    private y: number,
    private type: TreeType // shared flyweight
  ) {}

  draw() { this.type.draw(this.x, this.y); }
}
```

**DO:**
```typescript
// 1M trees, only unique TreeType instances in memory
const trees = coords.map(([x, y]) => new Tree(x, y, TreeTypeFactory.getTreeType('Oak', 'green', 'oak.png')));
```

**DON'T:**
```typescript
// Storing all state per instance — defeats the pattern
class Tree {
  name: string; color: string; texture: string; x: number; y: number; // ❌ 1M full copies
}
```

---

## 12. Proxy

**Intent:** Provide a substitute that controls access to another object.

**Use when:**
- Lazy initialization (virtual proxy).
- Access control (protection proxy).
- Logging, caching, remote access (remote/caching proxy).

**Do NOT use when:**
- The proxy adds latency without benefit.
- Simple direct access is sufficient.

**Pattern:**
```typescript
interface Subject {
  request(): void;
}

class RealSubject implements Subject {
  request() { console.log('RealSubject: request'); }
}

class CachingProxy implements Subject {
  private realSubject: RealSubject;
  private cache: string | null = null;

  request() {
    if (!this.cache) {
      this.realSubject = this.realSubject ?? new RealSubject();
      this.realSubject.request();
      this.cache = 'cached';
    } else {
      console.log('Proxy: returning cached result');
    }
  }
}
```

**DO:**
```typescript
const proxy = new CachingProxy();
proxy.request(); // hits RealSubject
proxy.request(); // served from cache
```

**DON'T:**
```typescript
// Don't use Proxy when the interface bloats with proxy-specific methods
class LeakyProxy implements Subject {
  clearCache() {} // ❌ leaks proxy implementation to consumers
}
```
