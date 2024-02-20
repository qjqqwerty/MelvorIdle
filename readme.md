# 访问您的 Mod 资源

在这里查看本主题的相关 [API 参考](Mod Creation/Mod Context API Reference#Loading Resources)。

很可能您会在您的 Mod 中打包一些资源，这些资源不在清单中定义的加载选项中，而是需要通过您的代码加载。您的 Mod 上下文对象提供了检索这些资源的方法。请记住，对于您的资源的所有文件路径引用都应相对于您的 Mod 的根目录。以下是一些常见情景。

## 加载（导入）一个模块

使用 `ctx.loadModule` 来导入 JavaScript 模块的导出特性。

```javascript
// my-module.mjs
export function greet(name) {
  console.log(`Hello, ${name}!`);
}

export const importantData = ['e', 'r', 'e', 'h', 't', ' ', 'o', 'l', 'l', 'e', 'h'];
// setup.mjs
export async function setup({ loadModule }) {
  const myModule = await loadModule('my-module.mjs');
  myModule.greet('Melvor'); // Hello, Melvor!
  console.log(myModule.importantData.reverse().join('')); // hello there
}
