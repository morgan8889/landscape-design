export function greet(name: string): string {
  return `Hello, ${name}!`;
}

function bootstrap() {
  const root = document.getElementById("app");
  if (root) {
    root.textContent = greet("Landscape Designer");
  }
}

if (typeof document !== "undefined") {
  bootstrap();
}
